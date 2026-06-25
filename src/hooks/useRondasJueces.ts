// Hook de configuración de rondas de jueces (Fase 5 — lado encargado).
// Carga etapas, retos y jueces de la edición activa, lista las rondas
// existentes y expone acciones para crear y cerrar rondas.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RondaJuezFormData } from '../schemas/rondaJuez'

// ─── Tipos de las opciones que el encargado combina al armar una ronda ──────
export interface EtapaOpcion {
  id: string
  name: string
  order_num: number
  status: string
}

export interface RetoOpcion {
  id: string
  name: string
  order_num: number
}

export interface JuezOpcion {
  id: string
  full_name: string | null
}

// Resumen de una ronda ya creada, para listarla en la página.
export interface RondaResumen {
  id: string
  stage_id: string
  stageName: string
  status: string
  closed_at: string | null
  numRetos: number
  numJueces: number
  challengeIds: string[]
  judgeIds: string[]
}

export interface UseRondasJuecesResult {
  etapas: EtapaOpcion[]
  retos: RetoOpcion[]
  jueces: JuezOpcion[]
  rondas: RondaResumen[]
  loading: boolean
  error: string | null
  crearRonda: (data: RondaJuezFormData) => Promise<void>
  editarRonda: (roundId: string, data: RondaJuezFormData) => Promise<void>
  cerrarRonda: (roundId: string) => Promise<void>
}

export function useRondasJueces(edicionId: string | undefined): UseRondasJuecesResult {
  const [etapas, setEtapas] = useState<EtapaOpcion[]>([])
  const [retos, setRetos] = useState<RetoOpcion[]>([])
  const [jueces, setJueces] = useState<JuezOpcion[]>([])
  const [rondas, setRondas] = useState<RondaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Disparador de recarga tras crear/cerrar una ronda.
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      if (!edicionId) {
        if (!cancelado) {
          setEtapas([])
          setRetos([])
          setJueces([])
          setRondas([])
          setLoading(false)
        }
        return
      }

      if (!cancelado) {
        setLoading(true)
        setError(null)
      }

      try {
        // 1. Etapas de la edición
        const { data: etapasData, error: etapasError } = await supabase
          .from('stages')
          .select('id, name, order_num, status')
          .eq('edition_id', edicionId)
          .order('order_num', { ascending: true })
        if (cancelado) return
        if (etapasError) throw etapasError

        // 2. Retos de la edición
        const { data: retosData, error: retosError } = await supabase
          .from('challenges')
          .select('id, name, order_num')
          .eq('edition_id', edicionId)
          .order('order_num', { ascending: true })
        if (cancelado) return
        if (retosError) throw retosError

        // 3. Jueces (perfiles con rol 'juez')
        const { data: juecesData, error: juecesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'juez')
          .order('full_name', { ascending: true })
        if (cancelado) return
        if (juecesError) throw juecesError

        // 4. Rondas de esta edición + nombre de etapa.
        //    judge_rounds no tiene edition_id; se filtra por los stage_ids ya
        //    cargados (cada stage pertenece a una sola edición). Si no hay
        //    etapas registradas aún, tampoco puede haber rondas.
        const stageIds = (etapasData ?? []).map((e) => e.id)
        if (stageIds.length === 0) {
          if (!cancelado) {
            setEtapas([])
            setRetos(retosData ?? [])
            setJueces(juecesData ?? [])
            setRondas([])
            setLoading(false)
          }
          return
        }

        const { data: rondasData, error: rondasError } = await supabase
          .from('judge_rounds')
          .select('id, stage_id, status, closed_at, stages(name)')
          .in('stage_id', stageIds)
          .order('created_at', { ascending: false })
        if (cancelado) return
        if (rondasError) throw rondasError

        // 5. IDs y conteos de retos y jueces por ronda (2 queries, sin N+1).
        //    Se almacenan los IDs para pre-poblar el formulario de edición.
        const roundIds = (rondasData ?? []).map((r) => r.id)
        const conteoRetos = new Map<string, number>()
        const conteoJueces = new Map<string, number>()
        const idsPorRondaRetos = new Map<string, string[]>()
        const idsPorRondaJueces = new Map<string, string[]>()

        if (roundIds.length > 0) {
          const { data: rcData, error: rcError } = await supabase
            .from('judge_round_challenges')
            .select('round_id, challenge_id')
            .in('round_id', roundIds)
          if (cancelado) return
          if (rcError) throw rcError
          for (const row of rcData ?? []) {
            conteoRetos.set(row.round_id, (conteoRetos.get(row.round_id) ?? 0) + 1)
            const prev = idsPorRondaRetos.get(row.round_id) ?? []
            idsPorRondaRetos.set(row.round_id, [...prev, row.challenge_id])
          }

          const { data: rjData, error: rjError } = await supabase
            .from('judge_round_judges')
            .select('round_id, judge_id')
            .in('round_id', roundIds)
          if (cancelado) return
          if (rjError) throw rjError
          for (const row of rjData ?? []) {
            conteoJueces.set(row.round_id, (conteoJueces.get(row.round_id) ?? 0) + 1)
            const prev = idsPorRondaJueces.get(row.round_id) ?? []
            idsPorRondaJueces.set(row.round_id, [...prev, row.judge_id])
          }
        }

        const rondasResumen: RondaResumen[] = (rondasData ?? []).map((r) => ({
          id: r.id,
          stage_id: r.stage_id,
          // stages es la relación; Supabase la tipa como objeto (o null) en to-one
          stageName: r.stages?.name ?? '—',
          status: r.status,
          closed_at: r.closed_at,
          numRetos: conteoRetos.get(r.id) ?? 0,
          numJueces: conteoJueces.get(r.id) ?? 0,
          challengeIds: idsPorRondaRetos.get(r.id) ?? [],
          judgeIds: idsPorRondaJueces.get(r.id) ?? [],
        }))

        if (!cancelado) {
          setEtapas(etapasData ?? [])
          setRetos(retosData ?? [])
          setJueces(juecesData ?? [])
          setRondas(rondasResumen)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelado) {
          // Exponemos el detalle real. Ojo: Supabase devuelve PostgrestError (un
          // objeto plano con .message/.code, NO un Error de JS), por eso leemos
          // .message del objeto además del caso Error. Ayuda a distinguir red
          // caída de RLS o tabla inexistente.
          const detalle =
            err instanceof Error
              ? err.message
              : typeof err === 'object' && err !== null && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'error desconocido'
          setError(`No se pudieron cargar las rondas de jueces: ${detalle}`)
          setLoading(false)
        }
      }
    }

    void cargar()
    return () => {
      cancelado = true
    }
  }, [edicionId, recargar])

  // ─── Crear ronda ──────────────────────────────────────────────────────────
  // Inserta la ronda y sus relaciones (retos + jueces). Si falla una relación,
  // borra la ronda recién creada (cascade limpia las hijas) para no dejar
  // rondas a medias. Re-lanza para que la página muestre el toast de error.
  const crearRonda = useCallback(async (data: RondaJuezFormData): Promise<void> => {
    const { data: ronda, error: rondaError } = await supabase
      .from('judge_rounds')
      .insert({ stage_id: data.stage_id })
      .select('id')
      .single()
    if (rondaError) throw rondaError

    try {
      const filasRetos = data.challenge_ids.map((cid) => ({
        round_id: ronda.id,
        challenge_id: cid,
      }))
      const { error: retosError } = await supabase
        .from('judge_round_challenges')
        .insert(filasRetos)
      if (retosError) throw retosError

      const filasJueces = data.judge_ids.map((jid) => ({
        round_id: ronda.id,
        judge_id: jid,
      }))
      const { error: juecesError } = await supabase
        .from('judge_round_judges')
        .insert(filasJueces)
      if (juecesError) throw juecesError
    } catch (err) {
      // Rollback manual: borrar la ronda arrastra retos/jueces por cascade.
      await supabase.from('judge_rounds').delete().eq('id', ronda.id)
      throw err
    }

    setRecargar((n) => n + 1)
  }, [])

  // ─── Editar ronda ─────────────────────────────────────────────────────────
  // Reemplaza la etapa, los retos y los jueces de una ronda existente.
  // Estrategia: actualizar la ronda, borrar relaciones antiguas y reinsertar.
  // No es una transacción atómica en la BD, pero es idempotente si se reintenta.
  const editarRonda = useCallback(async (roundId: string, data: RondaJuezFormData): Promise<void> => {
    // 1. Actualizar la etapa de la ronda
    const { error: updateError } = await supabase
      .from('judge_rounds')
      .update({ stage_id: data.stage_id })
      .eq('id', roundId)
    if (updateError) throw updateError

    // 2. Reemplazar retos: borrar existentes e insertar selección nueva
    const { error: borrarRetosError } = await supabase
      .from('judge_round_challenges')
      .delete()
      .eq('round_id', roundId)
    if (borrarRetosError) throw borrarRetosError

    const filasRetos = data.challenge_ids.map((cid) => ({
      round_id: roundId,
      challenge_id: cid,
    }))
    const { error: insertarRetosError } = await supabase
      .from('judge_round_challenges')
      .insert(filasRetos)
    if (insertarRetosError) throw insertarRetosError

    // 3. Reemplazar jueces: borrar existentes e insertar selección nueva
    const { error: borrarJuecesError } = await supabase
      .from('judge_round_judges')
      .delete()
      .eq('round_id', roundId)
    if (borrarJuecesError) throw borrarJuecesError

    const filasJueces = data.judge_ids.map((jid) => ({
      round_id: roundId,
      judge_id: jid,
    }))
    const { error: insertarJuecesError } = await supabase
      .from('judge_round_judges')
      .insert(filasJueces)
    if (insertarJuecesError) throw insertarJuecesError

    setRecargar((n) => n + 1)
  }, [])

  // ─── Cerrar ronda ────────────────────────────────────────────────────────
  // Cambia el status a 'cerrada'; el trigger de BD sella closed_at.
  // Las calificaciones de los jueces quedan en read-only desde ese momento.
  const cerrarRonda = useCallback(async (roundId: string): Promise<void> => {
    const { error: cerrarError } = await supabase
      .from('judge_rounds')
      .update({ status: 'cerrada' })
      .eq('id', roundId)
    if (cerrarError) throw cerrarError
    setRecargar((n) => n + 1)
  }, [])

  return { etapas, retos, jueces, rondas, loading, error, crearRonda, editarRonda, cerrarRonda }
}
