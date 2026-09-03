// Hook de datos de la vista Promedios del director (Fase 6, paso 3).
// Compone usePuntosJueces (puntos de jueces por ronda; la RLS
// "judge_scores_select_admin" cubre a encargado Y director) y agrega los
// puntos capturados por el encargado (challenge_scores) sumados por
// participante en toda la edición.

import { useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { usePuntosJueces } from './usePuntosJueces'
import { useConsulta } from './useConsulta'
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

const SIN_TOTALES = new Map<string, number>()

export function usePromediosDirector(edicionId: string | undefined): UsePromediosDirectorResult {
  const jueces = usePuntosJueces(edicionId)

  // Sin edición NO se pasa null a useConsulta: eso dejaría loading en true para
  // siempre. Se devuelve un mapa vacío, que es lo que hacía antes.
  const encargado = useConsulta<Map<string, number>>(
    async () => {
      if (!edicionId) return { data: SIN_TOTALES, error: null }

      // 1. Retos de la edición (challenge_scores no tiene edition_id directo)
      const { data: retosData, error: retosError } = await supabase
        .from('challenges')
        .select('id')
        .eq('edition_id', edicionId)
      if (retosError) return { data: null, error: retosError }

      const challengeIds = (retosData ?? []).map((r) => r.id)
      if (challengeIds.length === 0) return { data: SIN_TOTALES, error: null }

      // 2. Puntos del encargado, sumados por participante
      const { data: scoresData, error: scoresError } = await supabase
        .from('challenge_scores')
        .select('participant_id, score')
        .in('challenge_id', challengeIds)
      if (scoresError) return { data: null, error: scoresError }

      const mapa = new Map<string, number>()
      for (const s of scoresData ?? []) {
        mapa.set(s.participant_id, (mapa.get(s.participant_id) ?? 0) + s.score)
      }
      return { data: mapa, error: null }
    },
    [edicionId],
  )

  const recargarJueces = jueces.recargar
  const recargarEncargado = encargado.recargar
  const recargar = useCallback(() => {
    recargarEncargado()
    recargarJueces()
  }, [recargarEncargado, recargarJueces])

  const totalesEncargado = encargado.datos ?? SIN_TOTALES

  return useMemo(
    () => ({
      rondas: jueces.rondas,
      puntajes: jueces.puntajes,
      totalesEncargado,
      loading: jueces.loading || encargado.loading,
      // Mensaje propio para el fallo de los puntos del encargado: el crudo de
      // Supabase no le dice nada a quien opera. El de jueces ya viene formado.
      error:
        jueces.error ??
        (encargado.error === null ? null : 'No se pudieron cargar los puntos del encargado'),
      recargar,
    }),
    [
      jueces.rondas,
      jueces.puntajes,
      jueces.loading,
      jueces.error,
      totalesEncargado,
      encargado.loading,
      encargado.error,
      recargar,
    ],
  )
}
