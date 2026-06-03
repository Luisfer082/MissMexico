import { z } from 'zod'

export const retoSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120, 'Nombre demasiado largo'),
  description: z.string().max(500, 'Descripción demasiado larga').optional().or(z.literal('')),
  order_num: z
    .number({ error: 'Ingresa un número de orden válido' })
    .int('Debe ser un número entero')
    .min(1, 'El orden debe ser mayor a 0')
    .max(99, 'Número de orden fuera de rango'),
})

export type RetoFormData = z.infer<typeof retoSchema>
