import { z } from 'zod'

export const participanteSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120, 'Nombre demasiado largo'),
  sash_number: z
    .number({ error: 'Ingresa un número de banda válido' })
    .int('Debe ser un número entero')
    .min(1, 'El número de banda debe ser mayor a 0')
    .max(999, 'Número de banda fuera de rango'),
  region: z.string().min(2, 'La región debe tener al menos 2 caracteres').max(80, 'Región demasiado larga'),
  photo_url: z.string().url('Ingresa una URL válida').optional().or(z.literal('')),
})

export type ParticipanteFormData = z.infer<typeof participanteSchema>
