// Hook de datos de la pantalla Títulos del director (Fase 6, pasos 4-5).
// Carga el catálogo de títulos de la edición, las asignaciones actuales y las
// participantes; expone las mutations de asignar/quitar (drag-and-drop).
// La RLS "title_assignments_write_director" limita la escritura al director;
// el trigger prevent_mutation_when_approved bloquea tocar lo ya aprobado.

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/useAppStore'
import type { Tables } from '../types/database'

export interface ParticipanteTitulos {
  id: string
  full_name: string
  region: string
  sash_number: number
}

export interface UseTitulosResult {
  titulos: Tables<'titles'>[]
  asignaciones: Tables<'title_assignments'>[]
  participantes: ParticipanteTitulos[]
  loading: boolean
  error: string | null
  recargar: () => void
  /** Asigna (o reemplaza) la participante de un título. */
  asignar: (tituloId: string, participantId: string) => Promise<void>
  /** Quita una asignación no aprobada. */
  quitar: (asignacionId: string) => Promise<void>
}

export function useTitulos(edicionId: string | undefined): UseTitulosResult {
  const user = useAppStore((s) => s.user)

  const [titulos, setTitulos] = useState<Tables<'titles'>[]>([])
  const [asignaciones, setAsignaciones] = useState<Tables<'title_assignments'>[]>([])
  const [participantes, setParticipantes] = useState<ParticipanteTitulos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contador, setContador] = useState(0)

  const recargar = useCallback(() => setContador((n) => n + 1), [])

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      if (!edicionId) {
        if (!cancelado) {
          setTitulos([])
          setAsignaciones([])
          setParticipantes([])
          setLoading(false)
        }
        return
      }

      if (!cancelado) {
        setLoading(true)
        setError(null)
      }

      try {
        const { data: titulosData, error: titulosError } = await supabase
          .from('titles')
          .select('*')
          .eq('edition_id', edicionId)
          .order('order_num', { ascending: true })
        if (cancelado) return
        if (titulosError) throw titulosError

        const { data: asignData, error: asignError } = await supabase
          .from('title_assignments')
          .select('*')
          .eq('edition_id', edicionId)
        if (cancelado) return
        if (asignError) throw asignError

        const { data: partsData, error: partsError } = await supabase
          .from('participants')
          .select('id, full_name, region, sash_number')
          .eq('edition_id', edicionId)
          .order('sash_number', { ascending: true })
        if (cancelado) return
        if (partsError) throw partsError

        if (!cancelado) {
          setTitulos(titulosData ?? [])
          setAsignaciones(asignData ?? [])
          setParticipantes(partsData ?? [])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los títulos')
          setLoading(false)
        }
      }
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [edicionId, contador])

  const asignar = useCallback(
    async (tituloId: string, participantId: string) => {
      if (!edicionId) return
      // Captura al inicio: si el slot ya tiene asignación se reemplaza (update),
      // si no, se crea. Los unique de BD cubren cualquier carrera.
      const existente = asignaciones.find((a) => a.title_id === tituloId)
      if (existente?.participant_id === participantId) return

      await toast.promise(
        (async () => {
          if (existente) {
            const { error: err } = await supabase
              .from('title_assignments')
              .update({ participant_id: participantId, assigned_by: user?.id ?? null })
              .eq('id', existente.id)
            if (err) throw err
          } else {
            const { error: err } = await supabase.from('title_assignments').insert({
              edition_id: edicionId,
              title_id: tituloId,
              participant_id: participantId,
              assigned_by: user?.id ?? null,
            })
            if (err) throw err
          }
          recargar()
        })(),
        {
          loading: 'Asignando título...',
          success: 'Título asignado',
          error: (err: unknown) => (err instanceof Error ? err.message : 'Error al asignar'),
        },
      )
    },
    [edicionId, asignaciones, user?.id, recargar],
  )

  const quitar = useCallback(
    async (asignacionId: string) => {
      await toast.promise(
        (async () => {
          const { error: err } = await supabase
            .from('title_assignments')
            .delete()
            .eq('id', asignacionId)
          if (err) throw err
          recargar()
        })(),
        {
          loading: 'Quitando asignación...',
          success: 'Asignación quitada',
          error: (err: unknown) => (err instanceof Error ? err.message : 'Error al quitar'),
        },
      )
    },
    [recargar],
  )

  return { titulos, asignaciones, participantes, loading, error, recargar, asignar, quitar }
}
