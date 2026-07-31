// Slice del módulo Anunciador (Fase 7 — v1).
//
// DELIBERADAMENTE DESCARTABLE: v1 usa 3 títulos genéricos mock en memoria, SIN
// tocar la BD ni migraciones. El objetivo es probar el flujo de revelado uno por
// uno (pantalla de control + proyección) sin atar el diseño al catálogo real de
// 8 títulos ni a `title_assignments`. Cuando el flujo se sienta bien y Luis
// quiera datos reales, se decide aquí si conectar a Supabase + Realtime.
//
// Los títulos ya vienen en ORDEN DE REVELACIÓN (inverso: del menos importante al
// más importante), que es como el anunciador los proyecta en el escenario.

import type { StateCreator } from 'zustand'

export interface TituloAnuncio {
  id: string
  /** Nombre del título tal como se proyecta (ej. "Segunda finalista"). */
  titulo: string
  /** Participante que lo recibe. Mock en v1. */
  participante: string
}

// Mock v1: 3 títulos de prueba en orden de revelación (inverso: se revelan del
// menos importante al más importante, para generar suspenso en el escenario).
// Texto de ejemplo solo para previsualizar el look; NO son datos reales.
const TITULOS_MOCK: TituloAnuncio[] = [
  { id: 'g1', titulo: 'Segunda finalista', participante: 'Valeria Gómez · Jalisco' },
  { id: 'g2', titulo: 'Primera finalista', participante: 'Renata Cházaro · Veracruz' },
  { id: 'g3', titulo: 'Miss México 2026', participante: 'Ximena Torres · Nuevo León' },
]

export interface AnuncioState {
  /** Títulos en orden de revelación (inverso). */
  anuncioTitulos: TituloAnuncio[]
  /** Cuántos títulos se han revelado ya (0 = ninguno, length = todos). */
  anuncioReveladosCount: number
  /** Revela el siguiente título. No pasa del total. */
  revelarSiguiente: () => void
  /** Reinicia el show: vuelve a cero revelados. */
  reiniciarAnuncio: () => void
}

export const createAnuncioSlice: StateCreator<AnuncioState> = (set, get) => ({
  anuncioTitulos: TITULOS_MOCK,
  anuncioReveladosCount: 0,

  revelarSiguiente: () => {
    const { anuncioReveladosCount, anuncioTitulos } = get()
    if (anuncioReveladosCount >= anuncioTitulos.length) return
    set({ anuncioReveladosCount: anuncioReveladosCount + 1 })
  },

  reiniciarAnuncio: () => set({ anuncioReveladosCount: 0 }),
})
