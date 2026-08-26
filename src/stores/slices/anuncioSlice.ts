// Slice del módulo Anunciador.
//
// Rework 2026-08-26 (§5.8, decisiones de Luis): el show es UNA sola pantalla
// con el título en turno centrado y un botón para revelar el siguiente; detrás
// hay una pantalla donde se cambia el ORDEN de revelación arrastrando.
//
// Los títulos se leen de Supabase. El orden por defecto es order_num
// DESCENDENTE (del menos importante al más importante, para generar suspenso),
// pero el anunciador puede reacomodarlo y ese orden SÍ se persiste en
// announcement_order: todo el estado del módulo vivía en memoria y una recarga
// del navegador en pleno evento lo perdía.
//
// El anunciador solo ve las asignaciones de una edición ya enviada por el
// director: lo garantiza la RLS title_assignments_select_anunciador_published,
// no el cliente. edition_publications se lee aquí solo para poder distinguir
// "todavía no han enviado nada" de "no hay títulos asignados".
//
// DEUDA CONOCIDA: el AVANCE de revelados (cuántos van) sigue en memoria, así
// que una recarga reinicia el show aunque el orden se conserve. Persistirlo
// además exige decidir qué pasa si dos pestañas avanzan a la vez (Fase 9).

import type { StateCreator } from 'zustand'
import { supabase } from '../../lib/supabase'
import { mensajeError } from '../../utils/mensaje-error'

export interface TituloAnuncio {
  /** id de la asignación (title_assignments.id). */
  id: string
  /** id del título; es la clave con la que se persiste el orden. */
  titleId: string
  /** Nombre del título tal como se proyecta (ej. "Segunda finalista"). */
  titulo: string
  /** Participante que lo recibe, ya formateada para proyectar. */
  participante: string
}

export interface AnuncioState {
  /** Títulos en orden de revelación. */
  anuncioTitulos: TituloAnuncio[]
  /** Cuántos títulos se han revelado ya (0 = ninguno, length = todos). */
  anuncioReveladosCount: number
  anuncioLoading: boolean
  anuncioError: string | null
  /** false = el director aún no ha enviado los títulos. */
  anuncioPublicado: boolean
  /** Edición cargada; se necesita para poder guardar el orden. */
  anuncioEdicionId: string | null
  /** El orden se movió y todavía no se ha guardado. */
  anuncioOrdenSinGuardar: boolean
  anuncioGuardando: boolean
  /** Carga los títulos asignados de la edición y su orden de revelación. */
  cargarAnuncio: (edicionId: string) => Promise<void>
  /** Revela el siguiente título. No pasa del total. */
  revelarSiguiente: () => void
  /** Reinicia el show: vuelve a cero revelados. */
  reiniciarAnuncio: () => void
  /** Mueve un título de una posición a otra (solo en memoria). */
  reordenarAnuncio: (desde: number, hasta: number) => void
  /** Persiste el orden actual en announcement_order. */
  guardarOrdenAnuncio: () => Promise<void>
}

async function idUsuarioActual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export const createAnuncioSlice: StateCreator<AnuncioState> = (set, get) => ({
  anuncioTitulos: [],
  anuncioReveladosCount: 0,
  anuncioLoading: true,
  anuncioError: null,
  anuncioPublicado: false,
  anuncioEdicionId: null,
  anuncioOrdenSinGuardar: false,
  anuncioGuardando: false,

  cargarAnuncio: async (edicionId) => {
    set({ anuncioLoading: true, anuncioError: null })

    try {
      // Las tres queries son independientes → una sola tanda paralela
      const [
        { data: asignaciones, error: errAsign },
        { data: publicacion, error: errPub },
        { data: orden, error: errOrden },
      ] = await Promise.all([
        supabase
          .from('title_assignments')
          .select('id, title_id, titles(name, order_num), participants(full_name, region)')
          .eq('edition_id', edicionId),
        supabase
          .from('edition_publications')
          .select('published')
          .eq('edition_id', edicionId)
          .maybeSingle(),
        supabase
          .from('announcement_order')
          .select('title_id, position')
          .eq('edition_id', edicionId),
      ])

      if (errAsign) throw errAsign
      if (errPub) throw errPub
      if (errOrden) throw errOrden

      // Orden guardado por el anunciador, si existe. Un título que no esté en
      // la tabla (asignado después de guardar el orden) cae al final y ahí se
      // desempata por order_num descendente, que es el orden por defecto.
      const posiciones = new Map((orden ?? []).map((o) => [o.title_id, o.position]))
      const SIN_POSICION = Number.MAX_SAFE_INTEGER

      const titulos: TituloAnuncio[] = (asignaciones ?? [])
        .filter((a) => a.titles !== null && a.participants !== null)
        .sort((a, b) => {
          const pa = posiciones.get(a.title_id) ?? SIN_POSICION
          const pb = posiciones.get(b.title_id) ?? SIN_POSICION
          if (pa !== pb) return pa - pb
          return (b.titles?.order_num ?? 0) - (a.titles?.order_num ?? 0)
        })
        .map((a) => ({
          id: a.id,
          titleId: a.title_id,
          titulo: a.titles?.name ?? '',
          participante: `${a.participants?.full_name ?? ''} · ${a.participants?.region ?? ''}`,
        }))

      set({
        anuncioTitulos: titulos,
        // Recargar reinicia el show: evita quedar con un contador mayor al
        // número de títulos si el director retiró o cambió asignaciones.
        anuncioReveladosCount: 0,
        anuncioPublicado: publicacion?.published ?? false,
        anuncioEdicionId: edicionId,
        anuncioOrdenSinGuardar: false,
        anuncioLoading: false,
      })
    } catch (err) {
      set({
        anuncioError: mensajeError(err, 'No se pudieron cargar los títulos a proyectar'),
        anuncioLoading: false,
      })
    }
  },

  revelarSiguiente: () => {
    const { anuncioReveladosCount, anuncioTitulos } = get()
    if (anuncioReveladosCount >= anuncioTitulos.length) return
    set({ anuncioReveladosCount: anuncioReveladosCount + 1 })
  },

  reiniciarAnuncio: () => set({ anuncioReveladosCount: 0 }),

  reordenarAnuncio: (desde, hasta) => {
    const { anuncioTitulos } = get()
    if (desde === hasta) return
    if (desde < 0 || desde >= anuncioTitulos.length) return
    if (hasta < 0 || hasta >= anuncioTitulos.length) return

    const copia = [...anuncioTitulos]
    const [movido] = copia.splice(desde, 1)
    copia.splice(hasta, 0, movido)
    set({ anuncioTitulos: copia, anuncioOrdenSinGuardar: true })
  },

  guardarOrdenAnuncio: async () => {
    const { anuncioEdicionId, anuncioTitulos } = get()
    if (!anuncioEdicionId) return

    set({ anuncioGuardando: true })
    try {
      const userId = await idUsuarioActual()
      // upsert por (edition_id, title_id): a diferencia del director, aquí la
      // clave no cambia nunca (los títulos son los mismos, solo se mueven de
      // posición), así que no hay riesgo de choque y no hace falta el
      // borrar-luego-insertar.
      const filas = anuncioTitulos.map((t, i) => ({
        edition_id: anuncioEdicionId,
        title_id: t.titleId,
        position: i + 1,
        updated_by: userId,
      }))

      const { error } = await supabase
        .from('announcement_order')
        .upsert(filas, { onConflict: 'edition_id,title_id' })

      if (error) throw error
      set({ anuncioOrdenSinGuardar: false, anuncioGuardando: false })
    } catch (err) {
      set({ anuncioGuardando: false })
      throw new Error(mensajeError(err, 'No se pudo guardar el orden de revelación'), {
        cause: err,
      })
    }
  },
})
