import { describe, it, expect } from 'vitest'
import { contarAvance, type JuezRonda, type ScoreRonda } from './avance-ronda'

// Este conteo decide si el encargado ve el aviso de calificaciones faltantes
// antes de cerrar. Un falso "completa" es el caso que pierde datos.

const juez = (id: string, activo = true): JuezRonda => ({ id, nombre: `Juez ${id}`, activo })

// Todas las combinaciones reto × participante para un juez.
const completo = (judgeId: string, retos: string[], participantes: string[]): ScoreRonda[] =>
  retos.flatMap((c) =>
    participantes.map((p) => ({ judge_id: judgeId, participant_id: p, challenge_id: c })),
  )

const RETOS = ['r1', 'r2']
const PARTICIPANTES = ['p1', 'p2', 'p3']

describe('contarAvance', () => {
  it('todos los jueces completos → completa', () => {
    const scores = [...completo('a', RETOS, PARTICIPANTES), ...completo('b', RETOS, PARTICIPANTES)]
    const avance = contarAvance([juez('a'), juez('b')], RETOS, PARTICIPANTES, scores)
    expect(avance.completa).toBe(true)
    expect(avance.incompletos).toEqual([])
    expect(avance.totalJuecesActivos).toBe(2)
  })

  it('un juez a medias aparece con capturadas y esperadas', () => {
    const scores = [...completo('a', RETOS, PARTICIPANTES), ...completo('b', ['r1'], PARTICIPANTES)]
    const avance = contarAvance([juez('a'), juez('b')], RETOS, PARTICIPANTES, scores)
    expect(avance.completa).toBe(false)
    expect(avance.incompletos).toHaveLength(1)
    expect(avance.incompletos[0]).toMatchObject({ id: 'b', capturadas: 3, esperadas: 6 })
  })

  it('un juez sin ninguna calificación cuenta como incompleto', () => {
    const avance = contarAvance([juez('a')], RETOS, PARTICIPANTES, [])
    expect(avance.incompletos[0]).toMatchObject({ capturadas: 0, esperadas: 6 })
  })

  it('no cuenta scores de un reto que ya no está en la ronda', () => {
    // El juez calificó r1 completo y un r3 que se quitó de la ronda: 6 filas,
    // pero solo 3 son de la ronda actual.
    const scores = [
      ...completo('a', ['r1'], PARTICIPANTES),
      ...completo('a', ['r3'], PARTICIPANTES),
    ]
    const avance = contarAvance([juez('a')], RETOS, PARTICIPANTES, scores)
    expect(avance.completa).toBe(false)
    expect(avance.incompletos[0].capturadas).toBe(3)
  })

  it('no cuenta scores de una participante que ya no está en la etapa', () => {
    const scores = [...completo('a', RETOS, ['p1', 'p2']), ...completo('a', RETOS, ['p9'])]
    const avance = contarAvance([juez('a')], RETOS, PARTICIPANTES, scores)
    expect(avance.incompletos[0].capturadas).toBe(4)
  })

  it('los inactivos van aparte y no vuelven incompleta la ronda', () => {
    const scores = completo('a', RETOS, PARTICIPANTES)
    const avance = contarAvance([juez('a'), juez('x', false)], RETOS, PARTICIPANTES, scores)
    expect(avance.completa).toBe(true)
    expect(avance.totalJuecesActivos).toBe(1)
    expect(avance.inactivos).toHaveLength(1)
    expect(avance.inactivos[0]).toMatchObject({ id: 'x', capturadas: 0, esperadas: 6 })
  })

  it('ronda sin retos o sin participantes no espera nada', () => {
    expect(contarAvance([juez('a')], [], PARTICIPANTES, []).completa).toBe(true)
    expect(contarAvance([juez('a')], RETOS, [], []).completa).toBe(true)
  })

  it('ronda sin jueces es completa', () => {
    const avance = contarAvance([], RETOS, PARTICIPANTES, [])
    expect(avance.completa).toBe(true)
    expect(avance.totalJuecesActivos).toBe(0)
  })

  it('ordena incompletos del que más le falta al que menos', () => {
    const scores = [...completo('a', ['r1'], PARTICIPANTES), ...completo('b', RETOS, ['p1'])]
    const avance = contarAvance([juez('a'), juez('b')], RETOS, PARTICIPANTES, scores)
    expect(avance.incompletos.map((j) => j.id)).toEqual(['b', 'a'])
  })
})
