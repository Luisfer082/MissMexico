// Slice de la edición activa. Cachea la fila de editions con is_active=true
// para que las páginas no la refetcheen en cada navegación (antes, 8 páginas
// disparaban la misma query en cada mount). Toda mutación que cambie la
// edición activa (activar, renombrar) debe llamar refrescarEdicionActiva().
//
// Ese caché duraba TODA la sesión: si el encargado cambiaba de edición, las
// sesiones ya abiertas de juez y director se quedaban en la anterior hasta
// recargar la página. Desde el 2026-08-04 el slice se suscribe por realtime a
// editions (migración 20260804000000) y refetchea solo cuando cambia.

import type { StateCreator } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'

export interface EdicionState {
  edicionActiva: Tables<'editions'> | null
  edicionLoading: boolean
  edicionError: string | null
  /** true cuando ya se intentó cargar al menos una vez (dedupe del caché). */
  edicionCargada: boolean
  /** Carga la edición activa solo si aún no está en caché. */
  cargarEdicionActiva: () => Promise<void>
  /** Fuerza la recarga (tras activar/renombrar una edición). */
  refrescarEdicionActiva: () => Promise<void>
}

export const createEdicionSlice: StateCreator<EdicionState> = (set, get) => {
  // Promesa en vuelo para deduplicar: varias páginas pueden montar a la vez
  // y solo debe salir UNA query.
  let enVuelo: Promise<void> | null = null

  // Un solo canal por sesión: useEdicionActiva se monta en muchas páginas y
  // no debe abrir uno por cada una. Vive hasta que se cierra la pestaña.
  let canal: RealtimeChannel | null = null

  // Activar una edición son dos updates (apagar la anterior, encender la nueva)
  // → dos eventos de realtime → dos fetch que pueden responder desordenados.
  // El token descarta la respuesta que ya quedó obsoleta.
  let generacion = 0

  const fetchEdicion = async () => {
    const propia = ++generacion
    const vigente = () => propia === generacion

    set({ edicionLoading: true, edicionError: null })

    try {
      const { data, error } = await supabase
        .from('editions')
        .select('*')
        .eq('is_active', true)
        .single()

      if (!vigente()) return

      if (error) {
        // PGRST116 = no rows found — no hay edición activa, no es error crítico
        if (error.code === 'PGRST116') {
          set({ edicionActiva: null, edicionLoading: false, edicionCargada: true })
        } else {
          set({ edicionError: error.message, edicionLoading: false, edicionCargada: true })
        }
      } else {
        set({ edicionActiva: data, edicionLoading: false, edicionCargada: true })
      }
    } catch (err) {
      if (!vigente()) return
      set({
        edicionError: err instanceof Error ? err.message : 'Error desconocido',
        edicionLoading: false,
        edicionCargada: true,
      })
    } finally {
      enVuelo = null
    }
  }

  // Cualquier cambio en editions puede mover cuál es la activa (activar otra,
  // renombrar la actual). Se refetchea en vez de leer el payload: el evento de
  // "apagar la anterior" y el de "encender la nueva" llegan por separado y solo
  // una query sabe cuál quedó con is_active=true.
  const suscribir = () => {
    if (canal) return
    canal = supabase
      .channel('editions:activa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'editions' }, () => {
        void fetchEdicion()
      })
      .subscribe()
  }

  return {
    edicionActiva: null,
    // true hasta la primera carga: las páginas muestran su spinner de entrada
    edicionLoading: true,
    edicionError: null,
    edicionCargada: false,

    cargarEdicionActiva: async () => {
      suscribir()
      if (get().edicionCargada) return
      enVuelo ??= fetchEdicion()
      await enVuelo
    },

    refrescarEdicionActiva: async () => {
      enVuelo ??= fetchEdicion()
      await enVuelo
    },
  }
}
