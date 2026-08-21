// Slice del módulo Anunciador (§5.5, paso 5 — datos reales).
//
// La mecánica de revelado uno por uno viene del v1 mock (Fase 7) y se conserva
// tal cual; lo que cambia es el origen de los datos: ahora se leen los títulos
// asignados de la edición desde Supabase.
//
// Los títulos se ordenan por order_num DESCENDENTE, que es el orden de
// revelación en el escenario: del menos importante (Segunda finalista) al más
// importante (Miss México), para generar suspenso.
//
// El anunciador solo ve las asignaciones de una edición ya enviada por el
// director: lo garantiza la RLS title_assignments_select_anunciador_published,
// no el cliente. edition_publications se lee aquí solo para poder distinguir
// "todavía no han enviado nada" de "no hay títulos asignados".
//
// El estado de revelado vive en memoria: control y proyección son pestañas de
// la MISMA pantalla. Si algún día se separan en dos dispositivos, este estado
// tiene que mudarse a Supabase + Realtime.

import type { StateCreator } from 'zustand'
import { supabase } from '../../lib/supabase'
import { mensajeError } from '../../utils/mensaje-error'

export interface TituloAnuncio {
  id: string
  /** Nombre del título tal como se proyecta (ej. "Segunda finalista"). */
  titulo: string
  /** Participante que lo recibe, ya formateada para proyectar. */
  participante: string
}

export interface AnuncioState {
  /** Títulos en orden de revelación (inverso). */
  anuncioTitulos: TituloAnuncio[]
  /** Cuántos títulos se han revelado ya (0 = ninguno, length = todos). */
  anuncioReveladosCount: number
  anuncioLoading: boolean
  anuncioError: string | null
  /** false = el director aún no ha enviado los títulos. */
  anuncioPublicado: boolean
  /** Carga los títulos asignados de la edición. */
  cargarAnuncio: (edicionId: string) => Promise<void>
  /** Revela el siguiente título. No pasa del total. */
  revelarSiguiente: () => void
  /** Reinicia el show: vuelve a cero revelados. */
  reiniciarAnuncio: () => void
}

export const createAnuncioSlice: StateCreator<AnuncioState> = (set, get) => ({
  anuncioTitulos: [],
  anuncioReveladosCount: 0,
  anuncioLoading: true,
  anuncioError: null,
  anuncioPublicado: false,

  cargarAnuncio: async (edicionId) => {
    set({ anuncioLoading: true, anuncioError: null })

    try {
      // Las dos queries son independientes → una sola tanda paralela
      const [{ data: asignaciones, error: errAsign }, { data: publicacion, error: errPub }] =
        await Promise.all([
          supabase
            .from('title_assignments')
            .select('id, titles(name, order_num), participants(full_name, region)')
            .eq('edition_id', edicionId),
          supabase
            .from('edition_publications')
            .select('published')
            .eq('edition_id', edicionId)
            .maybeSingle(),
        ])

      if (errAsign) throw errAsign
      if (errPub) throw errPub

      const titulos: TituloAnuncio[] = (asignaciones ?? [])
        .filter((a) => a.titles !== null && a.participants !== null)
        .sort((a, b) => (b.titles?.order_num ?? 0) - (a.titles?.order_num ?? 0))
        .map((a) => ({
          id: a.id,
          titulo: a.titles?.name ?? '',
          participante: `${a.participants?.full_name ?? ''} · ${a.participants?.region ?? ''}`,
        }))

      set({
        anuncioTitulos: titulos,
        // Recargar reinicia el show: evita quedar con un contador mayor al
        // número de títulos si el director retiró o cambió asignaciones.
        anuncioReveladosCount: 0,
        anuncioPublicado: publicacion?.published ?? false,
        anuncioLoading: false,
      })
    } catch (err) {
      set({
        anuncioError:
          mensajeError(err, 'No se pudieron cargar los títulos a proyectar'),
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
})
