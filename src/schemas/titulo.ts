import { z } from 'zod'

// Validación del nombre de un título del catálogo (renombrado en el modal
// "Títulos" del módulo Encargado). La unicidad por edición la garantiza la BD.
export const tituloNombreSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(80, 'Nombre demasiado largo')

export type TituloNombre = z.infer<typeof tituloNombreSchema>
