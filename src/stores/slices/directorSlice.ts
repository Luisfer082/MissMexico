// Slice del módulo Director (§5.5, paso 2).
//
// Todo el trabajo del director (ranking manual + asignación de títulos) se edita
// en un BORRADOR en memoria y se persiste con un botón "Guardar" que manda el
// diff en una sola tanda. Dos razones:
//   1. No hacer un round-trip a la BD por cada movimiento de drag.
//   2. El estado sobrevive al cambio de pestaña (antes vivía en useState local
//      de la página y la selección se perdía al navegar).
//
// El envío al anunciador es REVERSIBLE (enviar/retirar sobre edition_publications).
// NUNCA se pone approved=true: el trigger prevent_mutation_when_approved queda
// dormido a propósito (decisión de Luis, 2026-07-30).

import type { StateCreator } from 'zustand'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'

export interface ParticipanteDirector {
  id: string
  full_name: string
  region: string
  sash_number: number
}

/** Borrador de asignaciones: título → participante (null = slot vacío). */
export type AsignacionesBorrador = Record<string, string | null>

export interface DirectorState {
  /** Edición cargada actualmente en el borrador. */
  directorEdicionId: string | null
  directorLoading: boolean
  directorError: string | null

  // ─── Datos de referencia (no se editan aquí) ───
  directorTitulos: Tables<'titles'>[]
  directorParticipantes: ParticipanteDirector[]

  // ─── Borrador editable ───
  /** IDs de participantes en orden manual (posición = índice + 1). */
  directorRanking: string[]
  directorAsignaciones: AsignacionesBorrador

  // ─── Snapshot de lo último guardado (para el diff) ───
  directorRankingGuardado: string[]
  directorAsignacionesGuardadas: AsignacionesBorrador
  /** Filas reales de title_assignments, para conocer sus id al borrar. */
  directorAsignacionesFilas: Tables<'title_assignments'>[]

  directorPublicado: boolean
  directorGuardando: boolean
  hayCambiosSinGuardar: boolean

  /**
   * Ronda de jueces seleccionada, compartida por las tres pestañas. Vive aquí
   * y no en useState de la página porque cada pestaña desmonta a la otra y la
   * selección se perdía al navegar. null = sin elegir (cae a la primera).
   */
  directorRondaId: string | null
  setDirectorRonda: (rondaId: string) => void

  /** Carga la edición en el borrador. No refetchea si ya es la misma. */
  cargarDirector: (edicionId: string) => Promise<void>
  /** Fuerza la recarga descartando el borrador. */
  recargarDirector: () => Promise<void>
  /** Mueve una participante dentro del ranking (drag de reordenamiento). */
  reordenarRanking: (participantId: string, haciaIndice: number) => void
  /** Asigna (o reemplaza) la participante de un título en el borrador. */
  asignarTitulo: (tituloId: string, participantId: string) => void
  /** Vacía un slot en el borrador. */
  quitarTitulo: (tituloId: string) => void
  /** Descarta los cambios y vuelve al último estado guardado. */
  descartarCambios: () => void
  /** Persiste el diff del borrador en una sola tanda. */
  guardarDirector: () => Promise<void>
  /** Publica/retira las asignaciones para el anunciador. Reversible. */
  publicarDirector: (publicado: boolean) => Promise<void>
  /** Reordena el ranking completo (p. ej. "ordenar por promedio de la ronda"). */
  reemplazarRanking: (ids: string[]) => void
}

// ─── Helpers de comparación ───────────────────────────────────────────────────

function mismoRanking(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

function mismasAsignaciones(a: AsignacionesBorrador, b: AsignacionesBorrador): boolean {
  const claves = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of claves) {
    if ((a[k] ?? null) !== (b[k] ?? null)) return false
  }
  return true
}

/** Id del usuario autenticado. getSession() lee de memoria, no va a la red. */
async function idUsuarioActual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export const createDirectorSlice: StateCreator<DirectorState> = (set, get) => {
  /** Recalcula el flag de cambios pendientes tras cada acción local. */
  const marcarCambios = () => {
    const s = get()
    set({
      hayCambiosSinGuardar:
        !mismoRanking(s.directorRanking, s.directorRankingGuardado) ||
        !mismasAsignaciones(s.directorAsignaciones, s.directorAsignacionesGuardadas),
    })
  }

  const fetchDirector = async (edicionId: string) => {
    // Las rondas pertenecen a una edición: si cambia, la selección deja de ser
    // válida. Un recargar sobre la misma edición sí la conserva.
    const cambioEdicion = get().directorEdicionId !== edicionId
    set({ directorLoading: true, directorError: null })

    try {
      // Las cinco queries son independientes → una sola tanda paralela
      const [
        { data: titulos, error: errTitulos },
        { data: asignaciones, error: errAsign },
        { data: participantes, error: errParts },
        { data: rankings, error: errRanking },
        { data: publicacion, error: errPub },
      ] = await Promise.all([
        supabase
          .from('titles')
          .select('*')
          .eq('edition_id', edicionId)
          .order('order_num', { ascending: true }),
        supabase.from('title_assignments').select('*').eq('edition_id', edicionId),
        supabase
          .from('participants')
          .select('id, full_name, region, sash_number')
          .eq('edition_id', edicionId)
          .order('sash_number', { ascending: true }),
        supabase
          .from('manual_rankings')
          .select('participant_id, position')
          .eq('edition_id', edicionId)
          .order('position', { ascending: true }),
        supabase
          .from('edition_publications')
          .select('published')
          .eq('edition_id', edicionId)
          .maybeSingle(),
      ])

      if (errTitulos) throw errTitulos
      if (errAsign) throw errAsign
      if (errParts) throw errParts
      if (errRanking) throw errRanking
      if (errPub) throw errPub

      const listaParticipantes = participantes ?? []

      // Ranking: primero las que ya tienen posición guardada (en ese orden),
      // luego las que no (participantes nuevas) por número de banda.
      const posiciones = new Map((rankings ?? []).map((r) => [r.participant_id, r.position]))
      const conRanking = listaParticipantes
        .filter((p) => posiciones.has(p.id))
        .sort((a, b) => (posiciones.get(a.id) ?? 0) - (posiciones.get(b.id) ?? 0))
      const sinRanking = listaParticipantes.filter((p) => !posiciones.has(p.id))
      const ranking = [...conRanking, ...sinRanking].map((p) => p.id)

      // Borrador de asignaciones: un slot por título, null si está vacío
      const filas = asignaciones ?? []
      const borrador: AsignacionesBorrador = {}
      for (const t of titulos ?? []) {
        borrador[t.id] = filas.find((a) => a.title_id === t.id)?.participant_id ?? null
      }

      set({
        directorEdicionId: edicionId,
        directorTitulos: titulos ?? [],
        directorParticipantes: listaParticipantes,
        directorRanking: ranking,
        directorRankingGuardado: ranking,
        directorAsignaciones: borrador,
        directorAsignacionesGuardadas: { ...borrador },
        directorAsignacionesFilas: filas,
        directorPublicado: publicacion?.published ?? false,
        hayCambiosSinGuardar: false,
        directorLoading: false,
        ...(cambioEdicion ? { directorRondaId: null } : {}),
      })
    } catch (err) {
      set({
        directorError:
          err instanceof Error ? err.message : 'No se pudieron cargar los datos del director',
        directorLoading: false,
      })
    }
  }

  return {
    directorEdicionId: null,
    directorLoading: true,
    directorError: null,
    directorTitulos: [],
    directorParticipantes: [],
    directorRanking: [],
    directorAsignaciones: {},
    directorRankingGuardado: [],
    directorAsignacionesGuardadas: {},
    directorAsignacionesFilas: [],
    directorPublicado: false,
    directorGuardando: false,
    hayCambiosSinGuardar: false,
    directorRondaId: null,

    setDirectorRonda: (rondaId) => set({ directorRondaId: rondaId }),

    cargarDirector: async (edicionId) => {
      // Ya cargada: no se refetchea para no pisar el borrador en curso.
      if (get().directorEdicionId === edicionId && !get().directorError) {
        set({ directorLoading: false })
        return
      }
      await fetchDirector(edicionId)
    },

    recargarDirector: async () => {
      const edicionId = get().directorEdicionId
      if (!edicionId) return
      await fetchDirector(edicionId)
    },

    reordenarRanking: (participantId, haciaIndice) => {
      const actual = get().directorRanking
      const desde = actual.indexOf(participantId)
      if (desde === -1 || desde === haciaIndice) return

      const nuevo = [...actual]
      nuevo.splice(desde, 1)
      nuevo.splice(Math.max(0, Math.min(haciaIndice, nuevo.length)), 0, participantId)
      set({ directorRanking: nuevo })
      marcarCambios()
    },

    reemplazarRanking: (ids) => {
      set({ directorRanking: [...ids] })
      marcarCambios()
    },

    asignarTitulo: (tituloId, participantId) => {
      const actual = get().directorAsignaciones
      if (actual[tituloId] === participantId) return

      // Una participante = un solo título: si ya ocupaba otro slot, se libera.
      const nuevo: AsignacionesBorrador = { ...actual }
      for (const [id, pid] of Object.entries(nuevo)) {
        if (pid === participantId) nuevo[id] = null
      }
      nuevo[tituloId] = participantId
      set({ directorAsignaciones: nuevo })
      marcarCambios()
    },

    quitarTitulo: (tituloId) => {
      const actual = get().directorAsignaciones
      if (actual[tituloId] == null) return
      set({ directorAsignaciones: { ...actual, [tituloId]: null } })
      marcarCambios()
    },

    descartarCambios: () => {
      const s = get()
      set({
        directorRanking: [...s.directorRankingGuardado],
        directorAsignaciones: { ...s.directorAsignacionesGuardadas },
        hayCambiosSinGuardar: false,
      })
    },

    guardarDirector: async () => {
      const s = get()
      const edicionId = s.directorEdicionId
      if (!edicionId || s.directorGuardando) return

      set({ directorGuardando: true })

      try {
        const userId = await idUsuarioActual()

        // ── Diff de asignaciones ──
        // Los cambios se aplican como BORRAR-luego-INSERTAR (no update): si dos
        // participantes intercambian título, un update en paralelo chocaría con
        // el unique (edition_id, participant_id). Borrar primero lo evita.
        const idsABorrar: string[] = []
        const filasAInsertar: {
          edition_id: string
          title_id: string
          participant_id: string
          assigned_by: string | null
        }[] = []

        for (const [tituloId, participantId] of Object.entries(s.directorAsignaciones)) {
          const previo = s.directorAsignacionesGuardadas[tituloId] ?? null
          if (previo === participantId) continue

          if (previo !== null) {
            const fila = s.directorAsignacionesFilas.find((a) => a.title_id === tituloId)
            if (fila) idsABorrar.push(fila.id)
          }
          if (participantId !== null) {
            filasAInsertar.push({
              edition_id: edicionId,
              title_id: tituloId,
              participant_id: participantId,
              assigned_by: userId,
            })
          }
        }

        // ── Diff de ranking ──
        const rankingCambio = !mismoRanking(s.directorRanking, s.directorRankingGuardado)
        const filasRanking = s.directorRanking.map((participantId, i) => ({
          edition_id: edicionId,
          participant_id: participantId,
          position: i + 1,
          updated_by: userId,
        }))

        // El ranking va en paralelo con la secuencia de asignaciones: son tablas
        // distintas y no compiten por ningún unique.
        const tareaRanking = rankingCambio
          ? supabase
              .from('manual_rankings')
              .upsert(filasRanking, { onConflict: 'edition_id,participant_id' })
          : null

        const tareaAsignaciones = (async () => {
          if (idsABorrar.length > 0) {
            const { error } = await supabase
              .from('title_assignments')
              .delete()
              .in('id', idsABorrar)
            if (error) throw error
          }
          if (filasAInsertar.length > 0) {
            const { error } = await supabase.from('title_assignments').insert(filasAInsertar)
            if (error) throw error
          }
        })()

        const [resultadoRanking] = await Promise.all([tareaRanking, tareaAsignaciones])
        if (resultadoRanking?.error) throw resultadoRanking.error

        // Refetch solo de las asignaciones: hacen falta los id de las filas
        // recién insertadas para poder borrarlas en el próximo guardado.
        const { data: filas, error: errFilas } = await supabase
          .from('title_assignments')
          .select('*')
          .eq('edition_id', edicionId)
        if (errFilas) throw errFilas

        const actual = get()
        set({
          directorAsignacionesFilas: filas ?? [],
          directorRankingGuardado: [...actual.directorRanking],
          directorAsignacionesGuardadas: { ...actual.directorAsignaciones },
          hayCambiosSinGuardar: false,
          directorGuardando: false,
        })
      } catch (err) {
        set({ directorGuardando: false })
        throw err instanceof Error ? err : new Error('No se pudieron guardar los cambios')
      }
    },

    publicarDirector: async (publicado) => {
      const edicionId = get().directorEdicionId
      if (!edicionId) return

      const userId = await idUsuarioActual()
      const { error } = await supabase
        .from('edition_publications')
        .upsert(
          { edition_id: edicionId, published: publicado, updated_by: userId },
          { onConflict: 'edition_id' },
        )
      if (error) throw error

      set({ directorPublicado: publicado })
    },
  }
}
