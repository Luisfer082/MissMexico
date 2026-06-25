import { z } from 'zod'

export const rondaJuezSchema = z.object({
  stage_id: z.string().uuid('Selecciona una etapa válida'),
  challenge_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos un reto'),
  judge_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos un juez'),
})

export type RondaJuezFormData = z.infer<typeof rondaJuezSchema>
