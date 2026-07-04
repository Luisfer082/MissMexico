// Hook offline-first de calificación del juez (Fase 5 — regla operativa 8).
// Las calificaciones se escriben primero en estado local + localStorage
// (estado 'pendiente') y se intentan sincronizar a Supabase. Si no hay red,
// quedan en cola y se reintenta al reconectar o periódicamente. Persisten en
// localStorage hasta confirmarse en el servidor.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/useAppStore'
import type { RondaActiva, ScoreJuezInicial } from './useRondaJuez'

export type EstadoSync = 'offline' | 'sincronizando' | 'sincronizado' | 'bloqueado'

interface EntradaScore {
  score: number
  synced: boolean
}

export interface UseCalificacionJuezResult {
  getScore: (participantId: string, challengeId: string) => number | undefined
  setScore: (participantId: string, challengeId: string, score: number) => void
  estado: EstadoSync
  pendientes: number
  // true cuando la BD rechazó el sync porque la ronda se cerró (o se eliminó)
  // mientras el juez calificaba. La página congela la captura al detectarlo.
  rondaBloqueada: boolean
  syncNow: () => void
}

const claveStorage = (roundId: string) => `juez_scores_${roundId}`
const k = (participantId: string, challengeId: string) => `${participantId}:${challengeId}`

// Detecta el rechazo del trigger prevent_judge_score_on_closed_round: PostgREST
// entrega los RAISE EXCEPTION de plpgsql con code P0001. Se distingue del error
// de red para no reintentar en bucle lo que la BD siempre va a rechazar.
function esRechazoDeRonda(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { code?: unknown; message?: unknown }
  return (
    e.code === 'P0001' &&
    typeof e.message === 'string' &&
    e.message.includes('ronda de jueces')
  )
}

export function useCalificacionJuez(
  ronda: RondaActiva | null,
  scoresIniciales: ScoreJuezInicial[],
): UseCalificacionJuezResult {
  const user = useAppStore((s) => s.user)

  const [scores, setScores] = useState<Map<string, EntradaScore>>(new Map())
  const [online, setOnline] = useState<boolean>(() => navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  // La BD rechazó el sync: la ronda se cerró/eliminó en caliente.
  const [rondaBloqueada, setRondaBloqueada] = useState(false)

  // Ref siempre actualizado para que sync() lea el Map vigente sin recrearse.
  const scoresRef = useRef(scores)
  useEffect(() => {
    scoresRef.current = scores
  }, [scores])

  // Guard de concurrencia: evita que el interval de 15 s y setScore disparen
  // dos sync() solapados (el upsert es idempotente, pero es trabajo duplicado).
  const syncEnCursoRef = useRef(false)

  // Persistencia en localStorage (la cola sobrevive recargas y cierres de pestaña).
  const persist = useCallback(
    (map: Map<string, EntradaScore>) => {
      if (!ronda) return
      const obj: Record<string, EntradaScore> = {}
      for (const [key, val] of map) obj[key] = val
      try {
        localStorage.setItem(claveStorage(ronda.id), JSON.stringify(obj))
      } catch {
        // Cuota llena / modo privado: no es fatal, el estado en memoria sigue vivo.
      }
    },
    [ronda],
  )

  // ─── Sembrado al cambiar de ronda ──────────────────────────────────────────
  // Base = scores del servidor (synced). Encima, los pendientes de localStorage
  // (ediciones aún no sincronizadas) tienen prioridad.
  useEffect(() => {
    // Sincronización con un sistema externo (localStorage) al cambiar de ronda:
    // sembramos el estado desde el servidor + la cola persistida. El setState
    // síncrono aquí es intencional y acotado a este caso de seeding.
    if (!ronda) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScores(new Map())
      setRondaBloqueada(false)
      return
    }
    setRondaBloqueada(false)
    const map = new Map<string, EntradaScore>()
    for (const s of scoresIniciales) {
      map.set(k(s.participant_id, s.challenge_id), { score: s.score, synced: true })
    }
    try {
      const raw = localStorage.getItem(claveStorage(ronda.id))
      if (raw) {
        const stored = JSON.parse(raw) as Record<string, EntradaScore>
        for (const [key, val] of Object.entries(stored)) {
          // Un pendiente local representa una edición no confirmada: gana.
          if (!val.synced || !map.has(key)) map.set(key, val)
        }
      }
    } catch {
      // localStorage corrupto: ignoramos y usamos solo el servidor.
    }
    setScores(map)
  }, [ronda, scoresIniciales])

  // ─── Sincronización ────────────────────────────────────────────────────────
  const sync = useCallback(async () => {
    if (!ronda || !user) return
    // Ronda cerrada: no se sincroniza (el trigger de BD lo rechazaría igual).
    if (ronda.status === 'cerrada') return
    // La BD ya rechazó por ronda cerrada/eliminada: reintentar es inútil.
    if (rondaBloqueada) return
    if (!navigator.onLine) return
    if (syncEnCursoRef.current) return

    const pendientes = [...scoresRef.current.entries()].filter(([, v]) => !v.synced)
    if (pendientes.length === 0) return

    syncEnCursoRef.current = true
    setSyncing(true)
    try {
      for (const [key, entrada] of pendientes) {
        const [participantId, challengeId] = key.split(':')
        const { error } = await supabase.from('judge_scores').upsert(
          {
            judge_id: user.id,
            participant_id: participantId,
            challenge_id: challengeId,
            stage_id: ronda.stage_id,
            score: entrada.score,
          },
          { onConflict: 'judge_id,participant_id,challenge_id' },
        )
        if (error) throw error

        // Marcar esta entrada como sincronizada (las demás siguen su curso).
        setScores((prev) => {
          const siguiente = new Map(prev)
          const actual = siguiente.get(key)
          // Solo confirmar si el valor no cambió mientras sincronizábamos.
          if (actual && actual.score === entrada.score) {
            siguiente.set(key, { ...actual, synced: true })
          }
          persist(siguiente)
          return siguiente
        })
      }
    } catch (err) {
      if (esRechazoDeRonda(err)) {
        // La ronda se cerró (o eliminó) mientras el juez calificaba: congelar
        // la captura y avisar una sola vez, sin bucle de reintentos.
        setRondaBloqueada(true)
        toast.error(
          'La ronda fue cerrada por el encargado. Las calificaciones que no alcanzaron a enviarse quedaron congeladas.',
          { duration: 8000 },
        )
      } else {
        // Error de red u otro transitorio; se reintentará al reconectar o en el próximo tick.
        toast.error('No se pudieron sincronizar algunas calificaciones. Reintentando…')
      }
    } finally {
      syncEnCursoRef.current = false
      setSyncing(false)
    }
  }, [ronda, user, persist, rondaBloqueada])

  // ─── setScore: optimista + persistencia + intento de sync ───────────────────
  const setScore = useCallback(
    (participantId: string, challengeId: string, score: number) => {
      setScores((prev) => {
        const siguiente = new Map(prev)
        siguiente.set(k(participantId, challengeId), { score, synced: false })
        persist(siguiente)
        return siguiente
      })
      void sync()
    },
    [persist, sync],
  )

  const getScore = useCallback(
    (participantId: string, challengeId: string): number | undefined =>
      scores.get(k(participantId, challengeId))?.score,
    [scores],
  )

  // ─── Conectividad: reintentar al reconectar ──────────────────────────────────
  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      void sync()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [sync])

  // ─── Reintento periódico mientras haya pendientes ────────────────────────────
  useEffect(() => {
    const id = setInterval(() => void sync(), 15000)
    return () => clearInterval(id)
  }, [sync])

  const pendientes = useMemo(
    () => [...scores.values()].filter((v) => !v.synced).length,
    [scores],
  )

  // 'bloqueado' solo cuando quedaron pendientes que ya no se pueden enviar; si
  // todo alcanzó a sincronizarse antes del cierre, se reporta 'sincronizado'.
  const bloqueadaConPendientes =
    (rondaBloqueada || ronda?.status === 'cerrada') && pendientes > 0

  const estado: EstadoSync = bloqueadaConPendientes
    ? 'bloqueado'
    : !online
      ? 'offline'
      : syncing || pendientes > 0
        ? 'sincronizando'
        : 'sincronizado'

  return { getScore, setScore, estado, pendientes, rondaBloqueada, syncNow: () => void sync() }
}
