import type { LeaderboardRow, ParticipanteCalif, ScoreEntry } from '../types/calificacion'

// Calcula el leaderboard a partir de participantes y scores crudos.
// Función pura: no toca React ni Supabase.
export function computeLeaderboard(
  participantes: ParticipanteCalif[],
  scores: ScoreEntry[],
): LeaderboardRow[] {
  if (participantes.length === 0) return []

  // Agrupa scores por participant_id
  const scoresPorParticipante = new Map<string, ScoreEntry[]>()
  for (const participante of participantes) {
    scoresPorParticipante.set(participante.id, [])
  }
  for (const entry of scores) {
    const lista = scoresPorParticipante.get(entry.participant_id)
    if (lista !== undefined) {
      lista.push(entry)
    }
  }

  // Construye filas sin posicion todavía
  const filas: Omit<LeaderboardRow, 'posicion'>[] = participantes.map((participante) => {
    const entradas = scoresPorParticipante.get(participante.id) ?? []
    const total = entradas.reduce((acum, e) => acum + e.score, 0)
    const promedio = entradas.length > 0 ? total / entradas.length : 0
    return { participant: participante, total, promedio }
  })

  // Ordena: desc por total, desempate asc por sash_number
  filas.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.participant.sash_number - b.participant.sash_number
  })

  // Asigna posicion 1-based
  return filas.map((fila, index) => ({ ...fila, posicion: index + 1 }))
}
