// Hook principal de calificaciones (Fase 4).
// Carga participantes, retos y scores; expone leaderboard reactivo
// y suscripción realtime a challenge_scores vía Supabase Realtime.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/useAppStore'
import { computeLeaderboard } from '../utils/leaderboard'
import type {
  LeaderboardRow,
  ParticipanteCalif,
  RetoCalif,
  ScoreEntry,
  UseCalificacionesResult,
} from '../types/calificacion'
import type { Tables } from '../types/database'

// Tipo de fila completa de challenge_scores tal como llega de la BD / realtime.
type ScoreRow = Tables<'challenge_scores'>
// Tipo de fila completa de judge_scores (BD / realtime).
type JudgeScoreRow = Tables<'judge_scores'>

// Entrada mínima de judge_scores para el total combinado del leaderboard.
interface JudgeScoreEntry {
  id: string // judge_scores.id
  participant_id: string
  score: number
}

export function useCalificaciones(edicionId: string | undefined): UseCalificacionesResult {
  const user = useAppStore((s) => s.user)

  const [participantes, setParticipantes] = useState<ParticipanteCalif[]>([])
  const [retos, setRetos] = useState<RetoCalif[]>([])
  // Mapa principal keyed por challenge_scores.id
  const [scores, setScores] = useState<Map<string, ScoreEntry>>(new Map())
  // Puntos de jueces (judge_scores) de la edición, keyed por judge_scores.id.
  // Alimentan el total combinado del leaderboard junto a challenge_scores.
  const [judgeScores, setJudgeScores] = useState<Map<string, JudgeScoreEntry>>(new Map())
  const [loading, setLoading] = useState(true)
  // Mensaje de error de la carga inicial; null cuando la carga fue exitosa.
  // El consumidor lo usa para mostrar un estado de error en vez de matriz vacía.
  const [error, setError] = useState<string | null>(null)
  // Estado del canal realtime: alimenta el indicador "En vivo" de la UI
  const [realtimeConectado, setRealtimeConectado] = useState(false)

  // Ref para que updateScore siempre acceda al Map actual sin recrearse en cada cambio de scores
  const scoresRef = useRef<Map<string, ScoreEntry>>(scores)
  useEffect(() => {
    scoresRef.current = scores
  }, [scores])

  // ─── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      // Sin edición activa: vaciamos el estado y salimos
      if (!edicionId) {
        if (!cancelado) {
          setParticipantes([])
          setRetos([])
          setScores(new Map())
          setJudgeScores(new Map())
          setLoading(false)
        }
        return
      }

      if (!cancelado) {
        setLoading(true)
        // Limpiar error de un intento previo antes de recargar
        setError(null)
      }

      try {
        // 1. Participantes de la edición
        const { data: partsData, error: partsError } = await supabase
          .from('participants')
          .select('id, full_name, region, sash_number')
          .eq('edition_id', edicionId)
          .order('sash_number', { ascending: true })

        if (cancelado) return
        if (partsError) throw partsError

        // 2. Retos de la edición
        const { data: retosData, error: retosError } = await supabase
          .from('challenges')
          .select('id, name, order_num')
          .eq('edition_id', edicionId)
          .order('order_num', { ascending: true })

        if (cancelado) return
        if (retosError) throw retosError

        const challengeIds = (retosData ?? []).map((r) => r.id)

        // 3. Scores (solo si existe al menos un reto)
        const scoresMap = new Map<string, ScoreEntry>()
        if (challengeIds.length > 0) {
          const { data: scoresData, error: scoresError } = await supabase
            .from('challenge_scores')
            .select('id, challenge_id, participant_id, score')
            .in('challenge_id', challengeIds)

          if (cancelado) return
          if (scoresError) throw scoresError

          for (const row of scoresData ?? []) {
            scoresMap.set(row.id, {
              id: row.id,
              challenge_id: row.challenge_id,
              participant_id: row.participant_id,
              score: row.score,
            })
          }
        }

        // 4. Judge scores de la edición (para el total combinado del leaderboard).
        //    Se filtran por participant_id (cada participante pertenece a una sola
        //    edición). RLS "judge_scores_select_admin" permite al encargado leerlos.
        const judgeMap = new Map<string, JudgeScoreEntry>()
        const participantIds = (partsData ?? []).map((p) => p.id)
        if (participantIds.length > 0) {
          const { data: judgeData, error: judgeError } = await supabase
            .from('judge_scores')
            .select('id, participant_id, score')
            .in('participant_id', participantIds)

          if (cancelado) return
          if (judgeError) throw judgeError

          for (const row of judgeData ?? []) {
            judgeMap.set(row.id, {
              id: row.id,
              participant_id: row.participant_id,
              score: row.score,
            })
          }
        }

        if (!cancelado) {
          setParticipantes(partsData ?? [])
          setRetos(retosData ?? [])
          setScores(scoresMap)
          setJudgeScores(judgeMap)
          setLoading(false)
        }
      } catch {
        // Error de Supabase (rechazo de RLS, red caída, etc.). Sin esto la matriz
        // quedaría vacía sin avisar. Exponemos el error y notificamos con toast.
        // Dejamos loading en false para no bloquear la UI indefinidamente.
        if (!cancelado) {
          setError('No se pudieron cargar las calificaciones. Revisa tu conexión e intenta de nuevo.')
          toast.error('No se pudieron cargar las calificaciones')
          setLoading(false)
        }
      }
    }

    void cargar()

    return () => {
      cancelado = true
    }
  }, [edicionId])

  // ─── Índice de lookup rápido por (participant_id:challenge_id) ────────────
  // Se recalcula solo cuando scores cambia; O(n) en memoización.
  const scoresPorPar = useMemo(() => {
    const mapa = new Map<string, ScoreEntry>()
    for (const entry of scores.values()) {
      mapa.set(`${entry.participant_id}:${entry.challenge_id}`, entry)
    }
    return mapa
  }, [scores])

  const getScore = useCallback(
    (participantId: string, challengeId: string): ScoreEntry | undefined =>
      scoresPorPar.get(`${participantId}:${challengeId}`),
    [scoresPorPar],
  )

  // ─── Total de jueces por participante ─────────────────────────────────────
  // Suma de judge_scores agrupada por participant_id; alimenta el leaderboard.
  const judgeTotals = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const entry of judgeScores.values()) {
      mapa.set(entry.participant_id, (mapa.get(entry.participant_id) ?? 0) + entry.score)
    }
    return mapa
  }, [judgeScores])

  // ─── Leaderboard derivado ─────────────────────────────────────────────────
  const leaderboard = useMemo<LeaderboardRow[]>(
    () => computeLeaderboard(participantes, [...scores.values()], judgeTotals),
    [participantes, scores, judgeTotals],
  )

  // ─── Realtime ─────────────────────────────────────────────────────────────
  // Set de challenge ids para filtrar payloads cuya edición no nos pertenece
  // (challenge_scores no tiene edition_id, hay que filtrar en cliente).
  const challengeIdsSet = useMemo(() => new Set(retos.map((r) => r.id)), [retos])

  // Ref que siempre apunta al set actual; el handler del canal lo usa
  // sin necesidad de re-suscribirse cada vez que cambia challengeIdsSet.
  const challengeIdsSetRef = useRef<Set<string>>(challengeIdsSet)
  useEffect(() => {
    challengeIdsSetRef.current = challengeIdsSet
  }, [challengeIdsSet])

  // Clave estable para la dependencia del useEffect de realtime: evita
  // cadenas de objetos Set que siempre serían nuevas referencias.
  const challengeIdsKey = retos.map((r) => r.id).join(',')

  useEffect(() => {
    // No suscribir hasta tener edición y al menos un reto cargado
    if (!edicionId || retos.length === 0) return

    // RealtimePostgresChangesPayload<ScoreRow> cubre INSERT | UPDATE | DELETE
    // sin recurrir a `any`. Para DELETE, `payload.old` es Partial<ScoreRow>
    // (la tabla tiene REPLICA IDENTITY FULL, así que en runtime llegan todos
    // los campos; el tipo es Partial por convención del SDK).
    const handler = (payload: RealtimePostgresChangesPayload<ScoreRow>) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const fila = payload.new
        // Filtro cliente: ignorar filas ajenas a esta edición
        if (!challengeIdsSetRef.current.has(fila.challenge_id)) return

        setScores((prev) => {
          const existente = prev.get(fila.id)
          // Echo idempotente: si los campos relevantes no cambiaron, devolvemos
          // el mismo Map para no disparar un re-render innecesario.
          if (
            existente !== undefined &&
            existente.score === fila.score &&
            existente.challenge_id === fila.challenge_id &&
            existente.participant_id === fila.participant_id
          ) {
            return prev
          }
          const siguiente = new Map(prev)
          siguiente.set(fila.id, {
            id: fila.id,
            challenge_id: fila.challenge_id,
            participant_id: fila.participant_id,
            score: fila.score,
          })
          return siguiente
        })
      } else if (payload.eventType === 'DELETE') {
        const viejo = payload.old
        // Con REPLICA IDENTITY FULL, old trae id y challenge_id en runtime
        if (!viejo.id) return
        if (viejo.challenge_id && !challengeIdsSetRef.current.has(viejo.challenge_id)) return

        const scoreId = viejo.id
        setScores((prev) => {
          if (!prev.has(scoreId)) return prev
          const siguiente = new Map(prev)
          siguiente.delete(scoreId)
          return siguiente
        })
      }
    }

    const canal = supabase
      .channel(`challenge_scores:${edicionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_scores' }, handler)
      .subscribe((status) => {
        // SUBSCRIBED es el único estado "conectado"; cualquier otro
        // (CHANNEL_ERROR, TIMED_OUT, CLOSED) apaga el indicador.
        setRealtimeConectado(status === 'SUBSCRIBED')
      })

    // Cleanup obligatorio: remueve el canal al desmontar o cuando cambien deps.
    // Evita canales colgados y suscripciones duplicadas en re-renders.
    return () => {
      setRealtimeConectado(false)
      void supabase.removeChannel(canal)
    }
    // challengeIdsKey cambia cuando los retos cambian; challengeIdsSetRef es un ref,
    // no necesita estar en deps (siempre está actualizado vía su propio useEffect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicionId, challengeIdsKey])

  // ─── Realtime de judge_scores ─────────────────────────────────────────────
  // Mantiene el total combinado del leaderboard en vivo a medida que los jueces
  // sincronizan. judge_scores no tiene edition_id; se filtra en cliente por el
  // set de participant_ids de la edición.
  const participantIdsSet = useMemo(
    () => new Set(participantes.map((p) => p.id)),
    [participantes],
  )
  const participantIdsSetRef = useRef<Set<string>>(participantIdsSet)
  useEffect(() => {
    participantIdsSetRef.current = participantIdsSet
  }, [participantIdsSet])

  const participantIdsKey = participantes.map((p) => p.id).join(',')

  useEffect(() => {
    if (!edicionId || participantes.length === 0) return

    const handler = (payload: RealtimePostgresChangesPayload<JudgeScoreRow>) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const fila = payload.new
        // Ignorar filas de participantes ajenos a esta edición
        if (!participantIdsSetRef.current.has(fila.participant_id)) return

        setJudgeScores((prev) => {
          const existente = prev.get(fila.id)
          if (
            existente !== undefined &&
            existente.score === fila.score &&
            existente.participant_id === fila.participant_id
          ) {
            return prev
          }
          const siguiente = new Map(prev)
          siguiente.set(fila.id, {
            id: fila.id,
            participant_id: fila.participant_id,
            score: fila.score,
          })
          return siguiente
        })
      } else if (payload.eventType === 'DELETE') {
        const viejo = payload.old
        if (!viejo.id) return
        if (viejo.participant_id && !participantIdsSetRef.current.has(viejo.participant_id)) return

        const scoreId = viejo.id
        setJudgeScores((prev) => {
          if (!prev.has(scoreId)) return prev
          const siguiente = new Map(prev)
          siguiente.delete(scoreId)
          return siguiente
        })
      }
    }

    const canal = supabase
      .channel(`judge_scores:${edicionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_scores' }, handler)
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
    // participantIdsKey cambia cuando cambian los participantes; el ref del set
    // se mantiene actualizado por su propio effect, no va en deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicionId, participantIdsKey])

  // ─── updateScore ──────────────────────────────────────────────────────────
  // Actualización optimista: modifica el Map local antes de ir a la BD.
  // En error revierte al valor previo y re-lanza para que ScoreCell muestre toast.
  const updateScore = useCallback(
    async (scoreId: string, value: number): Promise<void> => {
      // Capturar estado previo para revert usando el ref (evita dependencia en scores)
      const entradaPrevia = scoresRef.current.get(scoreId)

      // Actualización optimista inmediata
      setScores((prev) => {
        const entrada = prev.get(scoreId)
        if (!entrada) return prev
        const siguiente = new Map(prev)
        siguiente.set(scoreId, { ...entrada, score: value })
        return siguiente
      })

      try {
        // updated_at lo refresca un trigger en BD; no lo enviamos
        const { error } = await supabase
          .from('challenge_scores')
          .update({ score: value, updated_by: user?.id ?? null })
          .eq('id', scoreId)

        if (error) throw error
      } catch (err) {
        // Revertir al valor previo antes de re-lanzar
        setScores((prev) => {
          const siguiente = new Map(prev)
          if (entradaPrevia !== undefined) {
            siguiente.set(scoreId, entradaPrevia)
          } else {
            siguiente.delete(scoreId)
          }
          return siguiente
        })
        throw err
      }
    },
    [user],
    // scoresRef no necesita estar en deps: es una referencia mutable que siempre
    // apunta al Map actual sin causar recreaciones del callback.
  )

  return { participantes, retos, getScore, leaderboard, loading, error, updateScore, realtimeConectado }
}
