import { describe, it, expect } from 'vitest'
import { calcularFilasPromedio, promediosPorParticipante, type PuntoJuez } from './promedios'

// Este es el número que ordena el ranking del director y del que salen los
// títulos. Si algo del sistema no puede estar mal, es esto.

const punto = (
  participantId: string,
  sash: number,
  challengeId: string,
  score: number,
): PuntoJuez => ({
  participant_id: participantId,
  participant_name: `Participante ${sash}`,
  participant_region: 'Jalisco',
  sash_number: sash,
  challenge_id: challengeId,
  score,
})

describe('calcularFilasPromedio', () => {
  it('sin puntajes devuelve lista vacía', () => {
    expect(calcularFilasPromedio([])).toEqual([])
  })

  it('promedia sobre TODOS los puntajes, no por reto ni por juez', () => {
    // 2 jueces × 2 retos para la misma participante: 8, 9, 10, 9 → 9.
    const puntos = [
      punto('a', 1, 'reto1', 8),
      punto('a', 1, 'reto1', 9),
      punto('a', 1, 'reto2', 10),
      punto('a', 1, 'reto2', 9),
    ]

    const [fila] = calcularFilasPromedio(puntos)

    expect(fila.promedio).toBe(9)
    expect(fila.suma).toBe(36)
    expect(fila.cuenta).toBe(4)
  })

  it('promedia cada reto por separado', () => {
    const puntos = [
      punto('a', 1, 'reto1', 8),
      punto('a', 1, 'reto1', 10),
      punto('a', 1, 'reto2', 7),
    ]

    const [fila] = calcularFilasPromedio(puntos)

    const reto1 = fila.porReto.get('reto1')
    expect(reto1 && reto1.suma / reto1.cuenta).toBe(9)
    const reto2 = fila.porReto.get('reto2')
    expect(reto2 && reto2.suma / reto2.cuenta).toBe(7)
  })

  it('ordena por promedio descendente y numera desde 1', () => {
    const puntos = [
      punto('a', 1, 'reto1', 7),
      punto('b', 2, 'reto1', 10),
      punto('c', 3, 'reto1', 9),
    ]

    const filas = calcularFilasPromedio(puntos)

    expect(filas.map((f) => f.participant_id)).toEqual(['b', 'c', 'a'])
    expect(filas.map((f) => f.posicion)).toEqual([1, 2, 3])
  })

  it('desempata por número de banda ascendente', () => {
    // Empate real en una final: gana el desempate la banda más baja.
    const puntos = [punto('a', 12, 'reto1', 9.5), punto('b', 4, 'reto1', 9.5)]

    const filas = calcularFilasPromedio(puntos)

    expect(filas.map((f) => f.sash)).toEqual([4, 12])
    expect(filas.map((f) => f.posicion)).toEqual([1, 2])
  })

  it('un juez que no calificó a alguien NO la penaliza con un cero', () => {
    // Caso real: 2 jueces, uno olvidó una participante. Su promedio debe salir
    // de lo que SÍ se capturó (10), no de dividir entre los 2 jueces (5).
    const puntos = [
      punto('a', 1, 'reto1', 10),
      punto('b', 2, 'reto1', 9),
      punto('b', 2, 'reto1', 9),
    ]

    const filas = calcularFilasPromedio(puntos)

    expect(filas.find((f) => f.participant_id === 'a')?.promedio).toBe(10)
    expect(filas[0].participant_id).toBe('a')
  })

  it('adjunta el total del encargado sin mezclarlo en el promedio', () => {
    // El ranking lo ordena el promedio de jueces; los puntos del encargado son
    // solo referencia en pantalla. Si se sumaran, cambiarían el orden.
    const puntos = [punto('a', 1, 'reto1', 9), punto('b', 2, 'reto1', 8)]
    const totales = new Map([['b', 500]])

    const filas = calcularFilasPromedio(puntos, totales)

    expect(filas[0].participant_id).toBe('a')
    expect(filas[0].totalEncargado).toBe(0)
    expect(filas[1].totalEncargado).toBe(500)
    expect(filas[1].promedio).toBe(8)
  })

  it('una participante sin puntajes no aparece', () => {
    // No es un olvido: sin calificaciones no hay promedio que mostrar, y el
    // ranking la trata aparte (RankingPage la pinta con "—").
    const filas = calcularFilasPromedio([punto('a', 1, 'reto1', 9)], new Map([['z', 100]]))

    expect(filas).toHaveLength(1)
    expect(filas.some((f) => f.participant_id === 'z')).toBe(false)
  })

  it('conserva nombre, región y banda de la participante', () => {
    const [fila] = calcularFilasPromedio([punto('a', 7, 'reto1', 9)])

    expect(fila.name).toBe('Participante 7')
    expect(fila.region).toBe('Jalisco')
    expect(fila.sash).toBe(7)
  })
})

describe('promediosPorParticipante', () => {
  it('indexa los promedios por id', () => {
    const filas = calcularFilasPromedio([
      punto('a', 1, 'reto1', 9),
      punto('b', 2, 'reto1', 8),
    ])

    const mapa = promediosPorParticipante(filas)

    expect(mapa.get('a')).toBe(9)
    expect(mapa.get('b')).toBe(8)
    expect(mapa.get('inexistente')).toBeUndefined()
  })
})
