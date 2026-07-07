// Hook de datos de la vista Promedios del director (Fase 6, paso 3).
// Compone usePuntosJueces (puntos de jueces por ronda; la RLS
// "judge_scores_select_admin" cubre a encargado Y director) y agrega los
// puntos capturados por el encargado (challenge_scores) sumados por
// participante en toda la edición.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePuntosJueces } from './usePuntosJueces'
import type { FilaPuntoJuez, RondaPuntosJueces } from './usePuntosJueces'

export interface UsePromediosDirectorResult {
  rondas: RondaPuntosJueces[]
  puntajes: FilaPuntoJuez[]
  /** participant_id -> suma de sus challenge_scores en la edición */
  totalesEncargado: Map<string, number>
  loading: boolean
  error: string | null
  recargar: () => void
}

export function usePromediosDirector(edicionId: string | undefined): UsePromediosDirectorResult {
  const jueces = usePuntosJueces(edicionId)

  const [totalesEncargado, setTotalesEncargado] = useState<Map<string, number>>(new Map())
  const [loadingEncargado, setLoadingEncargado] = useState(true)
  const [errorEncargado, setErrorEncargado] = useState<string | null>(null)
  const [contador, setContador] = useState(0)

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      if (!edicionId) {
        if (!cancelado) {
          setTotalesEncargado(new Map())
          setLoadingEncargado(false)
        }
        return
      }

      if (!cancelado) {
        setLoadingEncargado(true)
        setErrorEncargado(null)
      }

      try {
        // 1. Retos de la edición (challenge_scores no tiene edition_id directo)
        const { data: retosData, error: retosError } = await supabase
          .from('challenges')
          .select('id')
          .eq('edition_id', edicionId)
        if (cancelado) return
        if (retosError) throw retosError

        const challengeIds = (retosData ?? []).map((r) => r.id)

        // 2. Puntos del encargado, sumados por participante
        const mapa = new Map<string, number>()
        if (challengeIds.length > 0) {
          const { data: scoresData, error: scoresError } = await supabase
            .from('challenge_scores')
            .select('participant_id, score')
            .in('challenge_id', challengeIds)
          if (cancelado) return
          if (scoresError) throw scoresError

          for (const s of scoresData ?? []) {
            mapa.set(s.participant_id, (mapa.get(s.participant_id) ?? 0) + s.score)
          }
        }

        if (!cancelado) {
          setTotalesEncargado(mapa)
          setLoadingEncargado(false)
        }
      } catch (err) {
        if (!cancelado) {
          setErrorEncargado(
            err instanceof Error ? err.message : 'No se pudieron cargar los puntos del encargado',
          )
          setLoadingEncargado(false)
        }
      }
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [edicionId, contador])

  // jueces.recargar es estable (useCallback sin deps en usePuntosJueces)
  const recargarJueces = jueces.recargar
  const recargar = useCallback(() => {
    setContador((n) => n + 1)
    recargarJueces()
  }, [recargarJueces])

  return {
    rondas: jueces.rondas,
    puntajes: jueces.puntajes,
    totalesEncargado,
    loading: jueces.loading || loadingEncargado,
    error: jueces.error ?? errorEncargado,
    recargar,
  }
}
