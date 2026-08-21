// Hook de configuración de rondas de jueces (Fase 5 — lado encargado).
// Carga etapas, retos y jueces de la edición activa, lista las rondas
// existentes y expone acciones para crear y cerrar rondas.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RondaJuezFormData } from '../schemas/rondaJuez'
import { mensajeError } from '../utils/mensaje-error'

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
  // Se cargan también los dados de baja: si uno ya estaba asignado a una ronda
  // debe seguir viéndose ahí. La página es la que decide a quién ofrecer.
  active: boolean
}

export interface ParticipanteOpcion {
  id: string
  full_name: string
  sash_number: number
  region: string
  photo_url: string | null
}

// Resumen de una ronda ya creada, para listarla en la página.
export interface RondaResumen {
  id: string
  stage_id: string
  stageName: string
  status: string
  // Estado de la ETAPA dueña de la ronda (independiente del status de la ronda).
  // Gobierna si se puede eliminar la ronda: etapa cerrada (regla 7) → no.
  stageStatus: string
  closed_at: string | null
  numRetos: number
  numJueces: number
  // Participantes de la ronda = stage_participants de su etapa (1:1 etapa↔ronda).
  numParticipantes: number
  challengeIds: string[]
  judgeIds: string[]
  participantIds: string[]
  // true si ya existen judge_scores en la etapa de la ronda. Con calificaciones
  // capturadas no se permite cambiar la ronda de etapa (los scores llevan el
  // stage_id y quedarían huérfanos del visor y de la ronda).
  tieneScores: boolean
}

export interface UseRondasJuecesResult {
  etapas: EtapaOpcion[]
  retos: RetoOpcion[]
  jueces: JuezOpcion[]
  participantes: ParticipanteOpcion[]
  rondas: RondaResumen[]
  loading: boolean
  error: string | null
  crearRonda: (data: RondaJuezFormData) => Promise<void>
  editarRonda: (roundId: string, data: RondaJuezFormData) => Promise<void>
  cerrarRonda: (roundId: string) => Promise<void>
  eliminarRonda: (roundId: string) => Promise<void>
  // Guarda los participantes de la etapa de una ronda (botón "+ Participantes").
  guardarParticipantesEtapa: (stageId: string, participantIds: string[]) => Promise<void>
}

export function useRondasJueces(edicionId: string | undefined): UseRondasJuecesResult {
  const [etapas, setEtapas] = useState<EtapaOpcion[]>([])
  const [retos, setRetos] = useState<RetoOpcion[]>([])
  const [jueces, setJueces] = useState<JuezOpcion[]>([])
  const [participantes, setParticipantes] = useState<ParticipanteOpcion[]>([])
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
          setParticipantes([])
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
        // Tanda 1: etapas, retos, jueces y participantes son independientes
        // entre sí → una sola tanda paralela.
        const [
          { data: etapasData, error: etapasError },
          { data: retosData, error: retosError },
          { data: juecesData, error: juecesError },
          { data: participantesData, error: participantesError },
        ] = await Promise.all([
          supabase
            .from('stages')
            .select('id, name, order_num, status')
            .eq('edition_id', edicionId)
            .order('order_num', { ascending: true }),
          supabase
            .from('challenges')
            .select('id, name, order_num')
            .eq('edition_id', edicionId)
            .order('order_num', { ascending: true }),
          supabase
            .from('profiles')
            .select('id, full_name, active')
            .eq('role', 'juez')
            .order('full_name', { ascending: true }),
          supabase
            .from('participants')
            .select('id, full_name, sash_number, region, photo_url')
            .eq('edition_id', edicionId)
            .order('sash_number', { ascending: true }),
        ])
        if (cancelado) return
        if (etapasError) throw etapasError
        if (retosError) throw retosError
        if (juecesError) throw juecesError
        if (participantesError) throw participantesError

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
            setParticipantes(participantesData ?? [])
            setRondas([])
            setLoading(false)
          }
          return
        }

        // Tanda 2: rondas, judge_scores por etapa y stage_participants solo
        // dependen de stageIds → en paralelo.
        const [
          { data: rondasData, error: rondasError },
          { data: jsData, error: jsError },
          { data: spData, error: spError },
        ] = await Promise.all([
          supabase
            .from('judge_rounds')
            .select('id, stage_id, status, closed_at, stages(name, status)')
            .in('stage_id', stageIds)
            .order('created_at', { ascending: false }),
          // Etapas que ya tienen judge_scores capturados (para bloquear el
          // cambio de etapa al editar). Solo se pide stage_id y se deduplica.
          supabase.from('judge_scores').select('stage_id').in('stage_id', stageIds),
          // Participantes por etapa (stage_participants). Como ronda↔etapa es
          // 1:1, los participantes de la ronda son los de su stage_id.
          supabase.from('stage_participants').select('stage_id, participant_id').in('stage_id', stageIds),
        ])
        if (cancelado) return
        if (rondasError) throw rondasError
        if (jsError) throw jsError
        if (spError) throw spError

        const etapasConScores = new Set<string>()
        for (const row of jsData ?? []) etapasConScores.add(row.stage_id)

        const idsPorEtapaParticipantes = new Map<string, string[]>()
        for (const row of spData ?? []) {
          const prev = idsPorEtapaParticipantes.get(row.stage_id) ?? []
          idsPorEtapaParticipantes.set(row.stage_id, [...prev, row.participant_id])
        }

        // Tanda 3: IDs y conteos de retos y jueces por ronda (2 queries en
        // paralelo, sin N+1). Se almacenan los IDs para pre-poblar el
        // formulario de edición.
        const roundIds = (rondasData ?? []).map((r) => r.id)
        const conteoRetos = new Map<string, number>()
        const conteoJueces = new Map<string, number>()
        const idsPorRondaRetos = new Map<string, string[]>()
        const idsPorRondaJueces = new Map<string, string[]>()

        if (roundIds.length > 0) {
          const [
            { data: rcData, error: rcError },
            { data: rjData, error: rjError },
          ] = await Promise.all([
            supabase
              .from('judge_round_challenges')
              .select('round_id, challenge_id')
              .in('round_id', roundIds),
            supabase
              .from('judge_round_judges')
              .select('round_id, judge_id')
              .in('round_id', roundIds),
          ])
          if (cancelado) return
          if (rcError) throw rcError
          if (rjError) throw rjError

          for (const row of rcData ?? []) {
            conteoRetos.set(row.round_id, (conteoRetos.get(row.round_id) ?? 0) + 1)
            const prev = idsPorRondaRetos.get(row.round_id) ?? []
            idsPorRondaRetos.set(row.round_id, [...prev, row.challenge_id])
          }
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
          stageStatus: r.stages?.status ?? 'abierta',
          closed_at: r.closed_at,
          numRetos: conteoRetos.get(r.id) ?? 0,
          numJueces: conteoJueces.get(r.id) ?? 0,
          numParticipantes: (idsPorEtapaParticipantes.get(r.stage_id) ?? []).length,
          challengeIds: idsPorRondaRetos.get(r.id) ?? [],
          judgeIds: idsPorRondaJueces.get(r.id) ?? [],
          participantIds: idsPorEtapaParticipantes.get(r.stage_id) ?? [],
          tieneScores: etapasConScores.has(r.stage_id),
        }))

        if (!cancelado) {
          setEtapas(etapasData ?? [])
          setRetos(retosData ?? [])
          setJueces(juecesData ?? [])
          setParticipantes(participantesData ?? [])
          setRondas(rondasResumen)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelado) {
          // Exponemos el detalle real. Ojo: Supabase devuelve PostgrestError (un
          // objeto plano con .message/.code, NO un Error de JS): mensajeError
          // cubre los dos casos. Ayuda a distinguir red caída de RLS o tabla
          // inexistente.
          const detalle = mensajeError(err, 'error desconocido')
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

  // ─── Participantes de la etapa ──────────────────────────────────────────
  // Diff contra stage_participants: inserta los nuevos, borra los quitados.
  // Idempotente (la unique(stage_id, participant_id) evita duplicados). No
  // recarga: lo usan crear/editar dentro de su propio flujo. Si la etapa está
  // cerrada, el trigger stage_participants_no_mutation_when_closed lo rechaza.
  const aplicarParticipantes = useCallback(
    async (stageId: string, participantIds: string[]): Promise<void> => {
      const { data: actualesData, error: leerError } = await supabase
        .from('stage_participants')
        .select('participant_id')
        .eq('stage_id', stageId)
      if (leerError) throw leerError

      const actuales = new Set((actualesData ?? []).map((r) => r.participant_id))
      const deseados = new Set(participantIds)
      const aInsertar = participantIds.filter((id) => !actuales.has(id))
      const aBorrar = [...actuales].filter((id) => !deseados.has(id))

      if (aBorrar.length > 0) {
        const { error: borrarError } = await supabase
          .from('stage_participants')
          .delete()
          .eq('stage_id', stageId)
          .in('participant_id', aBorrar)
        if (borrarError) throw borrarError
      }
      if (aInsertar.length > 0) {
        const { error: insertarError } = await supabase
          .from('stage_participants')
          .insert(aInsertar.map((pid) => ({ stage_id: stageId, participant_id: pid })))
        if (insertarError) throw insertarError
      }
    },
    [],
  )

  // Versión expuesta para el botón "+ Participantes" de la tarjeta: aplica y recarga.
  const guardarParticipantesEtapa = useCallback(
    async (stageId: string, participantIds: string[]): Promise<void> => {
      await aplicarParticipantes(stageId, participantIds)
      setRecargar((n) => n + 1)
    },
    [aplicarParticipantes],
  )

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

      // Participantes de la etapa (dentro del try para que entren al rollback).
      await aplicarParticipantes(data.stage_id, data.participant_ids)
    } catch (err) {
      // Rollback manual: borrar la ronda arrastra retos/jueces por cascade.
      await supabase.from('judge_rounds').delete().eq('id', ronda.id)
      throw err
    }

    setRecargar((n) => n + 1)
  }, [aplicarParticipantes])

  // ─── Editar ronda ─────────────────────────────────────────────────────────
  // Reemplaza la etapa, los retos y los jueces de una ronda existente.
  // Estrategia: actualizar la ronda, borrar relaciones antiguas y reinsertar.
  // No es una transacción atómica en la BD, pero es idempotente si se reintenta.
  const editarRonda = useCallback(async (roundId: string, data: RondaJuezFormData): Promise<void> => {
    // 0. Guarda: si la ronda cambia de etapa y ya hay judge_scores capturados
    //    en la etapa actual, se rechaza. Los scores llevan stage_id y migrarlos
    //    no es viable (el encargado no tiene UPDATE sobre judge_scores por RLS);
    //    permitirlo los dejaría huérfanos del visor pero sumando al leaderboard.
    const { data: rondaActual, error: rondaActualError } = await supabase
      .from('judge_rounds')
      .select('stage_id')
      .eq('id', roundId)
      .single()
    if (rondaActualError) throw rondaActualError

    if (rondaActual.stage_id !== data.stage_id) {
      const { count, error: scoresError } = await supabase
        .from('judge_scores')
        .select('id', { count: 'exact', head: true })
        .eq('stage_id', rondaActual.stage_id)
      if (scoresError) throw scoresError
      if ((count ?? 0) > 0) {
        throw new Error(
          'La ronda ya tiene calificaciones de jueces: no se puede cambiar de etapa.',
        )
      }
    }

    // 1. Actualizar la etapa de la ronda
    const { error: updateError } = await supabase
      .from('judge_rounds')
      .update({ stage_id: data.stage_id })
      .eq('id', roundId)
    if (updateError) throw updateError

    // 2. Retos: diff contra los actuales — insertar nuevos primero y borrar
    //    sobrantes al final. Si algo falla a medias, la ronda conserva una
    //    configuración utilizable en vez de quedar vacía (no hay transacción).
    const { data: retosActuales, error: leerRetosError } = await supabase
      .from('judge_round_challenges')
      .select('challenge_id')
      .eq('round_id', roundId)
    if (leerRetosError) throw leerRetosError

    const retosPrevios = new Set((retosActuales ?? []).map((r) => r.challenge_id))
    const retosDeseados = new Set(data.challenge_ids)
    const retosAInsertar = data.challenge_ids.filter((id) => !retosPrevios.has(id))
    const retosABorrar = [...retosPrevios].filter((id) => !retosDeseados.has(id))

    if (retosAInsertar.length > 0) {
      const { error: insertarRetosError } = await supabase
        .from('judge_round_challenges')
        .insert(retosAInsertar.map((cid) => ({ round_id: roundId, challenge_id: cid })))
      if (insertarRetosError) throw insertarRetosError
    }
    if (retosABorrar.length > 0) {
      const { error: borrarRetosError } = await supabase
        .from('judge_round_challenges')
        .delete()
        .eq('round_id', roundId)
        .in('challenge_id', retosABorrar)
      if (borrarRetosError) throw borrarRetosError
    }

    // 3. Jueces: mismo diff insertar-nuevos / borrar-sobrantes
    const { data: juecesActuales, error: leerJuecesError } = await supabase
      .from('judge_round_judges')
      .select('judge_id')
      .eq('round_id', roundId)
    if (leerJuecesError) throw leerJuecesError

    const juecesPrevios = new Set((juecesActuales ?? []).map((r) => r.judge_id))
    const juecesDeseados = new Set(data.judge_ids)
    const juecesAInsertar = data.judge_ids.filter((id) => !juecesPrevios.has(id))
    const juecesABorrar = [...juecesPrevios].filter((id) => !juecesDeseados.has(id))

    if (juecesAInsertar.length > 0) {
      const { error: insertarJuecesError } = await supabase
        .from('judge_round_judges')
        .insert(juecesAInsertar.map((jid) => ({ round_id: roundId, judge_id: jid })))
      if (insertarJuecesError) throw insertarJuecesError
    }
    if (juecesABorrar.length > 0) {
      const { error: borrarJuecesError } = await supabase
        .from('judge_round_judges')
        .delete()
        .eq('round_id', roundId)
        .in('judge_id', juecesABorrar)
      if (borrarJuecesError) throw borrarJuecesError
    }

    // 4. Reemplazar participantes de la etapa (diff insert/delete)
    await aplicarParticipantes(data.stage_id, data.participant_ids)

    setRecargar((n) => n + 1)
  }, [aplicarParticipantes])

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

  // ─── Eliminar ronda ──────────────────────────────────────────────────────
  // Borra la ronda; el cascade limpia sus retos y jueces (judge_round_*).
  // Solo se ofrece desde la UI mientras la ETAPA sigue abierta: con la etapa
  // cerrada el snapshot ya está grabado (regla 7) y no debe tocarse. Los
  // judge_scores no referencian round_id, así que no los arrastra el cascade.
  const eliminarRonda = useCallback(async (roundId: string): Promise<void> => {
    const { error: eliminarError } = await supabase
      .from('judge_rounds')
      .delete()
      .eq('id', roundId)
    if (eliminarError) throw eliminarError
    setRecargar((n) => n + 1)
  }, [])

  return {
    etapas,
    retos,
    jueces,
    participantes,
    rondas,
    loading,
    error,
    crearRonda,
    editarRonda,
    cerrarRonda,
    eliminarRonda,
    guardarParticipantesEtapa,
  }
}
