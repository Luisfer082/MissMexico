// Seed del catálogo de títulos de una edición (Fase 6, paso 2).
// Catálogo real definido por Luis (2026-07-30, §5.5): 5 nombres
// internacionales + un slot 6 genérico + las 2 finalistas. Se renombran
// desde el modal "Títulos" del módulo Encargado si hace falta.

import { supabase } from '../lib/supabase'

export interface TituloEstandar {
  name: string
  order_num: number
  kind: 'titulo' | 'finalista'
}

export const TITULOS_ESTANDAR: TituloEstandar[] = [
  { name: 'Miss México', order_num: 1, kind: 'titulo' },
  { name: 'Miss México Supranational', order_num: 2, kind: 'titulo' },
  { name: 'Miss México Cosmo', order_num: 3, kind: 'titulo' },
  { name: 'Miss México Elite', order_num: 4, kind: 'titulo' },
  { name: 'Miss México Top Model of the World', order_num: 5, kind: 'titulo' },
  { name: 'Título 6', order_num: 6, kind: 'titulo' },
  { name: 'Primera finalista', order_num: 7, kind: 'finalista' },
  { name: 'Segunda finalista', order_num: 8, kind: 'finalista' },
]

// Inserta los 8 títulos estándar para la edición dada. Lanza si falla
// (el caller decide cómo notificar). Los unique de BD (edition_id + name /
// order_num) impiden duplicar si se llama dos veces.
export async function seedTitulos(edicionId: string): Promise<void> {
  const filas = TITULOS_ESTANDAR.map((t) => ({ ...t, edition_id: edicionId }))
  const { error } = await supabase.from('titles').insert(filas)
  if (error) throw error
}
