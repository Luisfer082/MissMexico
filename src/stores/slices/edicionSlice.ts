// Slice de la edición activa. Cachea la fila de editions con is_active=true
// para que las páginas no la refetcheen en cada navegación (antes, 8 páginas
// disparaban la misma query en cada mount). Toda mutación que cambie la
// edición activa (activar, renombrar) debe llamar refrescarEdicionActiva().

import type { StateCreator } from 'zustand'
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

  const fetchEdicion = async () => {
    set({ edicionLoading: true, edicionError: null })

    try {
      const { data, error } = await supabase
        .from('editions')
        .select('*')
        .eq('is_active', true)
        .single()

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
      set({
        edicionError: err instanceof Error ? err.message : 'Error desconocido',
        edicionLoading: false,
        edicionCargada: true,
      })
    } finally {
      enVuelo = null
    }
  }

  return {
    edicionActiva: null,
    // true hasta la primera carga: las páginas muestran su spinner de entrada
    edicionLoading: true,
    edicionError: null,
    edicionCargada: false,

    cargarEdicionActiva: async () => {
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
