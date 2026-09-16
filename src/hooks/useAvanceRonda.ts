// Avance de captura de la ronda de jueces de una etapa, leído en el momento de
// cerrar. Consumo: módulo Encargado (cerrar etapa y cerrar ronda).
//
// Se consulta al abrir el diálogo y no se reutilizan los datos que ya cargó la
// página: esos son de cuando se entró, y el aviso tiene que reflejar lo que hay
// en la BD justo antes de cerrar.
//
// Seguridad: sin políticas nuevas. El encargado ya lee judge_scores
// (judge_scores_select_admin), judge_round_judges (…_select_admin),
// judge_round_challenges (select authenticated), stage_participants y
// profiles (profiles_select_encargado). No se usa service_role.

import { supabase } from '../lib/supabase'
import { useConsulta } from './useConsulta'
import { contarAvance, type AvanceRonda } from '../utils/avance-ronda'
import { mensajeError } from '../utils/mensaje-error'

export interface UseAvanceRondaResult {
  /** null si la etapa no tiene ronda de jueces (no hay nada que perder). */
  avance: AvanceRonda | null
  loading: boolean
  error: string | null
  recargar: () => void
}

// El resultado lleva la etapa a la que pertenece. useConsulta conserva los datos
// de la carga anterior y arranca la nueva en un efecto, así que al reabrir el
// diálogo hay un render con el avance de OTRA etapa y loading=false.
interface ResultadoAvance {
  stageId: string
  avance: AvanceRonda | null
}

async function cargarAvance(
  stageId: string,
): Promise<{ data: ResultadoAvance | null; error: { message: string } | null }> {
  try {
    // 1. Ronda (con jueces y retos), participantes y scores de la etapa, en paralelo.
    const [rondaRes, participantesRes, scoresRes] = await Promise.all([
      supabase
        .from('judge_rounds')
        .select('id, judge_round_judges(judge_id), judge_round_challenges(challenge_id)')
        .eq('stage_id', stageId)
        .maybeSingle(),
      supabase.from('stage_participants').select('participant_id').eq('stage_id', stageId),
      supabase
        .from('judge_scores')
        .select('judge_id, participant_id, challenge_id')
        .eq('stage_id', stageId),
    ])
    if (rondaRes.error) return { data: null, error: rondaRes.error }
    if (participantesRes.error) return { data: null, error: participantesRes.error }
    if (scoresRes.error) return { data: null, error: scoresRes.error }

    const ronda = rondaRes.data
    if (!ronda) return { data: { stageId, avance: null }, error: null }

    const judgeIds = ronda.judge_round_judges.map((j) => j.judge_id)
    const retoIds = ronda.judge_round_challenges.map((c) => c.challenge_id)

    // 2. Nombres y estado de los jueces asignados (necesita los ids de arriba).
    let perfiles: { id: string; full_name: string | null; active: boolean }[] = []
    if (judgeIds.length > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, active')
        .in('id', judgeIds)
      if (error) return { data: null, error }
      perfiles = data ?? []
    }
    const perfilPorId = new Map(perfiles.map((p) => [p.id, p]))

    const jueces = judgeIds.map((id) => {
      const perfil = perfilPorId.get(id)
      return {
        id,
        nombre: perfil?.full_name ?? 'Juez sin nombre',
        // Sin perfil legible se trata como activo: es preferible un aviso de
        // más que esconder a un juez al que le faltan calificaciones.
        activo: perfil?.active ?? true,
      }
    })

    const avance = contarAvance(
      jueces,
      retoIds,
      (participantesRes.data ?? []).map((p) => p.participant_id),
      scoresRes.data ?? [],
    )
    return { data: { stageId, avance }, error: null }
  } catch (err) {
    return {
      data: null,
      error: { message: mensajeError(err, 'No se pudo verificar el avance') },
    }
  }
}

export function useAvanceRonda(stageId: string | null): UseAvanceRondaResult {
  const { datos, loading, error, recargar } = useConsulta<ResultadoAvance>(
    stageId ? () => cargarAvance(stageId) : null,
    [stageId],
  )
  // Datos o error de otra etapa (o de antes de abrir el diálogo) = todavía cargando.
  const vigente = datos !== null && datos.stageId === stageId
  const sinResultado = !vigente && !error
  return {
    avance: vigente ? datos.avance : null,
    loading: loading || sinResultado,
    error: loading ? null : error,
    recargar,
  }
}
