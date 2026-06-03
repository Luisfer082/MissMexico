import { z } from 'zod'

export const etapaSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120, 'Nombre demasiado largo'),
  order_num: z
    .number({ error: 'Ingresa un número de orden válido' })
    .int('Debe ser un número entero')
    .min(1, 'El orden debe ser mayor a 0')
    .max(99, 'Número de orden fuera de rango'),
  cupo: z
    .number({ error: 'Ingresa un cupo válido' })
    .int('Debe ser un número entero')
    .min(1, 'El cupo debe ser mayor a 0')
    .max(99, 'Cupo fuera de rango'),
})

export type EtapaFormData = z.infer<typeof etapaSchema>
