import { describe, it, expect } from 'vitest'
import { computeLeaderboard } from './leaderboard'
import type { ParticipanteCalif, ScoreEntry } from '../types/calificacion'

// El leaderboard es el número que se proyecta y del que sale el ranking: aquí
// un error no es cosmético, cambia quién va arriba.

const participante = (id: string, sash: number): ParticipanteCalif => ({
  id,
  full_name: `Participante ${sash}`,
  region: 'Jalisco',
  sash_number: sash,
})

const score = (id: string, participantId: string, valor: number): ScoreEntry => ({
  id,
  challenge_id: `reto-${id}`,
  participant_id: participantId,
  score: valor,
})

describe('computeLeaderboard', () => {
  it('sin participantes devuelve lista vacía', () => {
    expect(computeLeaderboard([], [])).toEqual([])
  })

  it('ordena por total combinado descendente y numera desde 1', () => {
    const ps = [participante('a', 1), participante('b', 2), participante('c', 3)]
    const scores = [score('s1', 'a', 10), score('s2', 'b', 30), score('s3', 'c', 20)]

    const filas = computeLeaderboard(ps, scores)

    expect(filas.map((f) => f.participant.id)).toEqual(['b', 'c', 'a'])
    expect(filas.map((f) => f.posicion)).toEqual([1, 2, 3])
  })

  it('suma los puntos de jueces al total que rankea', () => {
    const ps = [participante('a', 1), participante('b', 2)]
    const scores = [score('s1', 'a', 10), score('s2', 'b', 20)]
    // 'a' va detrás por puntos del encargado, pero los jueces la ponen delante.
    const jueces = new Map([['a', 25]])

    const filas = computeLeaderboard(ps, scores, jueces)

    expect(filas[0].participant.id).toBe('a')
    expect(filas[0].total).toBe(35)
    expect(filas[0].totalEncargado).toBe(10)
    expect(filas[0].totalJueces).toBe(25)
    // El desglose debe seguir siendo auditable en la UI.
    expect(filas[0].totalEncargado + filas[0].totalJueces).toBe(filas[0].total)
  })

  it('desempata por número de banda ascendente', () => {
    const ps = [participante('a', 7), participante('b', 3)]
    const scores = [score('s1', 'a', 10), score('s2', 'b', 10)]

    const filas = computeLeaderboard(ps, scores)

    expect(filas.map((f) => f.participant.sash_number)).toEqual([3, 7])
  })

  it('el promedio es sobre los puntos del encargado, no sobre el total', () => {
    const ps = [participante('a', 1)]
    const scores = [score('s1', 'a', 8), score('s2', 'a', 10)]

    const [fila] = computeLeaderboard(ps, scores, new Map([['a', 100]]))

    expect(fila.promedio).toBe(9)
    expect(fila.total).toBe(118)
  })

  it('una participante sin calificar aparece en cero, no desaparece', () => {
    // Importa: al abrir la captura nadie tiene puntos y todas deben listarse.
    const ps = [participante('a', 1), participante('b', 2)]

    const filas = computeLeaderboard(ps, [])

    expect(filas).toHaveLength(2)
    expect(filas.every((f) => f.total === 0 && f.promedio === 0)).toBe(true)
  })

  it('ignora scores de participantes que no están en la lista', () => {
    // Pasa de verdad: challenge_scores no tiene edition_id y se filtra en
    // cliente, así que pueden llegar filas de otra edición.
    const ps = [participante('a', 1)]
    const scores = [score('s1', 'a', 10), score('s2', 'fantasma', 999)]

    const filas = computeLeaderboard(ps, scores)

    expect(filas).toHaveLength(1)
    expect(filas[0].total).toBe(10)
  })
})
