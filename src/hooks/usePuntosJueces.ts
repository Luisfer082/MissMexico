// Hook para cargar los puntos capturados por los jueces, agrupables por ronda.
// Consumo: módulo Encargado (visor Puntos jueces) y módulo Director (Promedios,
// vía usePromediosDirector). Jamás el módulo Juez (regla 5).
//
// Seguridad: no se agregan políticas nuevas. La política existente
// "judge_scores_select_admin" (migración 20260520010001_judge_scoring.sql)
// ya otorga SELECT sobre todas las filas de judge_scores a los roles
// 'encargado' y 'director'. No se usa service_role.

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export interface RondaPuntosJueces {
  id: string
  stage_id: string
  stage_name: string
  stage_order: number
  status: 'abierta' | 'cerrada'
  closed_at: string | null
}

export interface FilaPuntoJuez {
  id: string
  judge_id: string
  judge_name: string
  participant_id: string
  participant_name: string
  participant_region: string
  sash_number: number
  challenge_id: string
  challenge_name: string
  challenge_order: number
  score: number
  updated_at: string
  /** ID de la judge_round a la que pertenece este puntaje (derivado via stage_id) */
  round_id: string
}

export interface UsePuntosJuecesResult {
  rondas: RondaPuntosJueces[]
  puntajes: FilaPuntoJuez[]
  loading: boolean
  error: string | null
  recargar: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePuntosJueces(edicionId: string | undefined): UsePuntosJuecesResult {
  const [rondas, setRondas] = useState<RondaPuntosJueces[]>([])
  const [puntajes, setPuntajes] = useState<FilaPuntoJuez[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Incrementar este contador fuerza una recarga manual
  const [contador, setContador] = useState(0)

  const recargar = useCallback(() => setContador((n) => n + 1), [])

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      if (!edicionId) {
        if (!cancelado) {
          setRondas([])
          setPuntajes([])
          setLoading(false)
        }
        return
      }

      if (!cancelado) {
        setLoading(true)
        setError(null)
      }

      try {
        // 1. Etapas de la edición activa
        const { data: stagesData, error: stagesError } = await supabase
          .from('stages')
          .select('id, name, order_num')
          .eq('edition_id', edicionId)
          .order('order_num', { ascending: true })

        if (cancelado) return
        if (stagesError) throw stagesError

        const stagesMap = new Map(
          (stagesData ?? []).map((s) => [s.id, { name: s.name, order_num: s.order_num }]),
        )
        const stageIds = [...stagesMap.keys()]

        if (stageIds.length === 0) {
          if (!cancelado) {
            setRondas([])
            setPuntajes([])
            setLoading(false)
          }
          return
        }

        // 2. Rondas de jueces vinculadas a esas etapas
        const { data: rondasData, error: rondasError } = await supabase
          .from('judge_rounds')
          .select('id, stage_id, status, closed_at')
          .in('stage_id', stageIds)
          .order('created_at', { ascending: true })

        if (cancelado) return
        if (rondasError) throw rondasError

        const rondasMapeadas: RondaPuntosJueces[] = (rondasData ?? []).map((r) => {
          const stage = stagesMap.get(r.stage_id)
          return {
            id: r.id,
            stage_id: r.stage_id,
            stage_name: stage?.name ?? 'Etapa desconocida',
            stage_order: stage?.order_num ?? 0,
            // judge_rounds.status tiene check constraint ('abierta'|'cerrada')
            status: r.status as 'abierta' | 'cerrada',
            closed_at: r.closed_at,
          }
        })

        // Mapa stage_id -> round_id. judge_rounds tiene unique(stage_id), por eso es 1:1.
        const stageToRound = new Map(
          (rondasData ?? []).map((r) => [r.stage_id, r.id]),
        )

        const roundStageIds = (rondasData ?? []).map((r) => r.stage_id)

        if (roundStageIds.length === 0) {
          // Existen etapas pero ninguna tiene ronda de jueces aún
          if (!cancelado) {
            setRondas(rondasMapeadas)
            setPuntajes([])
            setLoading(false)
          }
          return
        }

        // 3. Judge scores de esas etapas con participante y reto embebidos.
        //    La política RLS "judge_scores_select_admin" permite al encargado
        //    leer TODAS las filas — no es necesario filtrar por judge_id.
        const { data: scoresData, error: scoresError } = await supabase
          .from('judge_scores')
          // El select debe ser UN literal (sin concatenar): TypeScript solo
          // conserva el tipo literal completo así, y el parser de tipos de
          // Supabase lo necesita para inferir las columnas del join.
          .select(
            'id, judge_id, participant_id, challenge_id, stage_id, score, updated_at, participants!judge_scores_participant_id_fkey(full_name, region, sash_number), challenges!judge_scores_challenge_id_fkey(name, order_num)',
          )
          .in('stage_id', roundStageIds)

        if (cancelado) return
        if (scoresError) throw scoresError

        // 4. Perfiles de los jueces para mostrar nombre legible.
        //    judge_scores.judge_id referencia auth.users (no profiles directamente),
        //    por eso se hace una consulta separada a profiles.
        const judgeIds = [...new Set((scoresData ?? []).map((s) => s.judge_id))]
        const profileMap = new Map<string, string | null>()

        if (judgeIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', judgeIds)

          if (cancelado) return
          if (profilesError) throw profilesError

          for (const p of profilesData ?? []) {
            profileMap.set(p.id, p.full_name)
          }
        }

        // 5. Construir filas planas combinando scores + participante + reto + perfil
        const filas: FilaPuntoJuez[] = []
        for (const s of scoresData ?? []) {
          const participant = s.participants
          const challenge = s.challenges
          // Ignorar si el join no resolvió (no debería ocurrir con FKs activos y NOT NULL)
          if (!participant || !challenge) continue

          const fullNameJuez = profileMap.get(s.judge_id)
          filas.push({
            id: s.id,
            judge_id: s.judge_id,
            // fullNameJuez puede ser undefined (sin perfil) o null (perfil sin nombre)
            judge_name: fullNameJuez ?? 'Juez sin nombre',
            participant_id: s.participant_id,
            participant_name: participant.full_name,
            participant_region: participant.region,
            sash_number: participant.sash_number,
            challenge_id: s.challenge_id,
            challenge_name: challenge.name,
            challenge_order: challenge.order_num,
            score: s.score,
            updated_at: s.updated_at,
            // Derivado: stage_id -> round_id via judge_rounds unique(stage_id)
            round_id: stageToRound.get(s.stage_id) ?? '',
          })
        }

        if (!cancelado) {
          setRondas(rondasMapeadas)
          setPuntajes(filas)
          setLoading(false)
        }
      } catch {
        if (!cancelado) {
          setError(
            'No se pudieron cargar los puntos de jueces. Revisa tu conexión e intenta de nuevo.',
          )
          toast.error('Error al cargar los puntos de jueces')
          setLoading(false)
        }
      }
    }

    void cargar()

    return () => {
      cancelado = true
    }
  }, [edicionId, contador])

  return { rondas, puntajes, loading, error, recargar }
}
