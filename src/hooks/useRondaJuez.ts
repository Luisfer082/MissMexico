// Hook de datos del juez (Fase 5 — lado juez).
// Carga la ronda asignada al juez logueado, sus retos, los finalistas
// (stage_participants) y las calificaciones previas del propio juez.
// El aislamiento (regla 5) lo garantiza la RLS: judge_round_judges y
// judge_scores filtran por judge_id = auth.uid(). Aquí solo pedimos lo nuestro.
//
// Las rondas se filtran por la EDICIÓN ACTIVA (fix 2026-08-04): antes se
// tomaban todas las rondas asignadas al juez de cualquier edición y se elegía
// la abierta más reciente, así que al cambiar de edición el juez se quedaba en
// la anterior (y en su etapa y participantes) aunque recargara. judge_rounds no
// tiene edition_id: se filtra por los stage_id de la edición, igual que
// useRondasJueces del lado Encargado.

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/useAppStore'
import { useEdicionActiva } from './useEdicionActiva'

export interface RondaActiva {
  id: string
  stage_id: string
  stage_name: string
  status: string
  closed_at: string | null
}

export interface RetoRonda {
  id: string
  name: string
  order_num: number
}

export interface FinalistaRonda {
  id: string
  full_name: string
  region: string
  sash_number: number
  photo_url: string | null
}

// Calificación previa del juez, indexada en la página por participant:challenge.
export interface ScoreJuezInicial {
  participant_id: string
  challenge_id: string
  score: number
}

export interface UseRondaJuezResult {
  ronda: RondaActiva | null
  retos: RetoRonda[]
  finalistas: FinalistaRonda[]
  scoresIniciales: ScoreJuezInicial[]
  loading: boolean
  error: string | null
}

export function useRondaJuez(): UseRondaJuezResult {
  const user = useAppStore((s) => s.user)
  const judgeId = user?.id
  const { edicion, loading: loadingEdicion } = useEdicionActiva()
  const edicionId = edicion?.id

  const [ronda, setRonda] = useState<RondaActiva | null>(null)
  const [retos, setRetos] = useState<RetoRonda[]>([])
  const [finalistas, setFinalistas] = useState<FinalistaRonda[]>([])
  const [scoresIniciales, setScoresIniciales] = useState<ScoreJuezInicial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    const limpiar = () => {
      setRonda(null)
      setRetos([])
      setFinalistas([])
      setScoresIniciales([])
      setLoading(false)
    }

    const cargar = async () => {
      if (!judgeId) {
        if (!cancelado) setLoading(false)
        return
      }

      // Sin edición activa no hay ronda que mostrar. Se espera a que el store
      // resuelva para no parpadear con "sin ronda" en la carga inicial.
      if (!edicionId) {
        if (!cancelado && !loadingEdicion) limpiar()
        return
      }

      if (!cancelado) {
        setLoading(true)
        setError(null)
      }

      try {
        // 1. Rondas asignadas al juez (RLS filtra a las propias) + etapas de la
        //    edición activa, para descartar las rondas de otras ediciones.
        const [
          { data: asignData, error: asignError },
          { data: etapasData, error: etapasError },
        ] = await Promise.all([
          supabase.from('judge_round_judges').select('round_id'),
          supabase.from('stages').select('id').eq('edition_id', edicionId),
        ])
        if (cancelado) return
        if (asignError) throw asignError
        if (etapasError) throw etapasError

        const stageIds = new Set((etapasData ?? []).map((e) => e.id))
        const roundIds = (asignData ?? []).map((a) => a.round_id)
        if (roundIds.length === 0 || stageIds.size === 0) {
          if (!cancelado) limpiar()
          return
        }

        // 2. Detalle de esas rondas; elegimos la activa (abierta más reciente,
        //    o la más reciente si todas están cerradas → vista read-only).
        const { data: rondasData, error: rondasError } = await supabase
          .from('judge_rounds')
          .select('id, stage_id, status, closed_at, created_at, stages(name)')
          .in('id', roundIds)
          .order('created_at', { ascending: false })
        if (cancelado) return
        if (rondasError) throw rondasError

        // Solo las rondas cuya etapa pertenece a la edición activa.
        const lista = (rondasData ?? []).filter((r) => stageIds.has(r.stage_id))
        const activa = lista.find((r) => r.status === 'abierta') ?? lista[0] ?? null

        if (!activa) {
          if (!cancelado) limpiar()
          return
        }

        // 3. Retos de la ronda
        const { data: rcData, error: rcError } = await supabase
          .from('judge_round_challenges')
          .select('challenge_id, challenges(id, name, order_num)')
          .eq('round_id', activa.id)
        if (cancelado) return
        if (rcError) throw rcError

        const retosRonda: RetoRonda[] = (rcData ?? [])
          .map((row) => row.challenges)
          .filter((c): c is RetoRonda => c !== null)
          .sort((a, b) => a.order_num - b.order_num)

        // 4. Finalistas de la etapa (stage_participants → participants)
        const { data: spData, error: spError } = await supabase
          .from('stage_participants')
          .select('participants(id, full_name, region, sash_number, photo_url)')
          .eq('stage_id', activa.stage_id)
        if (cancelado) return
        if (spError) throw spError

        const finalistasRonda: FinalistaRonda[] = (spData ?? [])
          .map((row) => row.participants)
          .filter((p): p is FinalistaRonda => p !== null)
          .sort((a, b) => a.sash_number - b.sash_number)

        // 5. Calificaciones previas del propio juez para los retos de la ronda
        const challengeIds = retosRonda.map((r) => r.id)
        let scores: ScoreJuezInicial[] = []
        if (challengeIds.length > 0) {
          const { data: scoresData, error: scoresError } = await supabase
            .from('judge_scores')
            .select('participant_id, challenge_id, score')
            .eq('judge_id', judgeId)
            .in('challenge_id', challengeIds)
          if (cancelado) return
          if (scoresError) throw scoresError
          scores = scoresData ?? []
        }

        if (!cancelado) {
          setRonda({
            id: activa.id,
            stage_id: activa.stage_id,
            // stages es la relación to-one; Supabase la tipa como objeto (o null)
            stage_name: activa.stages?.name ?? '—',
            status: activa.status,
            closed_at: activa.closed_at,
          })
          setRetos(retosRonda)
          setFinalistas(finalistasRonda)
          setScoresIniciales(scores)
          setLoading(false)
        }
      } catch {
        if (!cancelado) {
          setError('No se pudo cargar tu ronda. Revisa tu conexión e intenta de nuevo.')
          setLoading(false)
        }
      }
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [judgeId, edicionId, loadingEdicion])

  return { ronda, retos, finalistas, scoresIniciales, loading, error }
}
