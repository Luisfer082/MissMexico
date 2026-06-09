import { z } from 'zod'

export const scoreSchema = z
  .number({ error: 'El puntaje debe ser un número válido' })
  .min(0, 'El puntaje debe estar entre 0 y 10')
  .max(10, 'El puntaje debe estar entre 0 y 10')
  .refine(
    (n) => Math.round(n * 100) === n * 100,
    'Máximo 2 decimales',
  )

export type ScoreInput = z.infer<typeof scoreSchema>
