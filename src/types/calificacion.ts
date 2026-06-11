// Tipos del dominio de calificaciones (Fase 4).
// Contrato congelado: lo consumen el hook useCalificaciones, el util leaderboard
// y los componentes de matriz/leaderboard. No modificar sin re-coordinar.

export interface ParticipanteCalif {
  id: string
  full_name: string
  region: string
  sash_number: number
}

export interface RetoCalif {
  id: string
  name: string
  order_num: number
}

export interface ScoreEntry {
  id: string // challenge_scores.id
  challenge_id: string
  participant_id: string
  score: number
}

export interface LeaderboardRow {
  participant: ParticipanteCalif
  total: number
  promedio: number
  posicion: number // ranking 1-based
}

export interface UseCalificacionesResult {
  participantes: ParticipanteCalif[] // ordenadas por sash_number asc
  retos: RetoCalif[] // ordenados por order_num asc
  getScore: (participantId: string, challengeId: string) => ScoreEntry | undefined
  leaderboard: LeaderboardRow[]
  loading: boolean
  updateScore: (scoreId: string, value: number) => Promise<void>
  // true mientras el canal realtime está suscrito (indicador "En vivo" en UI)
  realtimeConectado: boolean
}
