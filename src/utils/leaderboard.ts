import type { LeaderboardRow, ParticipanteCalif, ScoreEntry } from '../types/calificacion'

// Calcula el leaderboard a partir de participantes y scores crudos.
// Función pura: no toca React ni Supabase.
//
// `judgeTotals` mapea participant_id -> suma de sus judge_scores. El total que
// rankea es la suma de los puntos del encargado (challenge_scores) más los de
// jueces. Se deja opcional para no romper otros usos del util.
export function computeLeaderboard(
  participantes: ParticipanteCalif[],
  scores: ScoreEntry[],
  judgeTotals: Map<string, number> = new Map(),
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
    const totalEncargado = entradas.reduce((acum, e) => acum + e.score, 0)
    const totalJueces = judgeTotals.get(participante.id) ?? 0
    // El promedio se mantiene sobre los puntos del encargado (escala original);
    // los puntos de jueces se reflejan en totalJueces y en el total combinado.
    const promedio = entradas.length > 0 ? totalEncargado / entradas.length : 0
    return {
      participant: participante,
      totalEncargado,
      totalJueces,
      total: totalEncargado + totalJueces,
      promedio,
    }
  })

  // Ordena: desc por total combinado, desempate asc por sash_number
  filas.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.participant.sash_number - b.participant.sash_number
  })

  // Asigna posicion 1-based
  return filas.map((fila, index) => ({ ...fila, posicion: index + 1 }))
}
