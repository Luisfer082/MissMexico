import { z } from 'zod'

const anioActual = new Date().getFullYear()

export const edicionSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120, 'Nombre demasiado largo'),
  year: z
    .number({ error: 'Ingresa un año válido' })
    .int('Debe ser un número entero')
    .min(2000, 'Año fuera de rango')
    .max(anioActual + 5, 'Año fuera de rango'),
})

export type EdicionFormData = z.infer<typeof edicionSchema>
