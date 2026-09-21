import { describe, it, expect } from 'vitest'
import {
  armarReporteCalificaciones,
  celdaATexto,
  LEYENDA_CONFIDENCIAL,
  type DatosExportacion,
  type PuntoJuezExport,
} from './exportar-calificaciones'

// El reporte sale de la app y se queda en una laptop: lo que diga tiene que
// coincidir con lo que ve el director en pantalla.

const juez = (
  judgeId: string,
  judgeName: string,
  roundId: string,
  participantId: string,
  sash: number,
  challengeId: string,
  score: number,
): PuntoJuezExport => ({
  judge_id: judgeId,
  judge_name: judgeName,
  participant_id: participantId,
  participant_name: `Participante ${sash}`,
  participant_region: 'Jalisco',
  sash_number: sash,
  challenge_id: challengeId,
  challenge_name: challengeId === 'r1' ? 'Pasarela' : 'Entrevista',
  challenge_order: challengeId === 'r1' ? 1 : 2,
  score,
  updated_at: '2026-09-21T18:30:00Z',
  round_id: roundId,
})

function datos(parcial: Partial<DatosExportacion> = {}): DatosExportacion {
  return {
    edicion: { name: 'Miss México', year: 2026 },
    generadoPor: 'Luis',
    generadoEn: new Date('2026-09-21T18:30:00Z'),
    retos: [],
    participantes: [],
    puntosEncargado: [],
    rondas: [],
    puntajesJueces: [],
    ...parcial,
  }
}

describe('armarReporteCalificaciones — cabecera', () => {
  it('siempre lleva la leyenda de confidencial y quién lo generó', () => {
    const r = armarReporteCalificaciones(datos())
    expect(r.cabecera[0]).toBe(LEYENDA_CONFIDENCIAL)
    expect(r.cabecera[1]).toContain('por Luis')
  })

  it('marca PRELIMINAR solo si hay una ronda abierta', () => {
    const cerrada = armarReporteCalificaciones(
      datos({ rondas: [{ id: 'x', stage_name: 'Top 16', stage_order: 1, status: 'cerrada' }] }),
    )
    expect(cerrada.cabecera.some((l) => l.startsWith('PRELIMINAR'))).toBe(false)

    const abierta = armarReporteCalificaciones(
      datos({ rondas: [{ id: 'x', stage_name: 'Top 16', stage_order: 1, status: 'abierta' }] }),
    )
    expect(abierta.cabecera.some((l) => l.startsWith('PRELIMINAR'))).toBe(true)
    expect(abierta.rondas[0].preliminar).toBe(true)
    expect(abierta.rondas[0].titulo).toContain('PRELIMINAR')
  })

  it('nombre de archivo con slug de la edición y fecha de México', () => {
    // 02:00 UTC del 22 sigue siendo el 21 en Ciudad de México.
    const r = armarReporteCalificaciones(
      datos({ generadoEn: new Date('2026-09-22T02:00:00Z') }),
    )
    expect(r.nombreArchivo).toBe('calificaciones-miss-mexico-2026-09-21')
  })
})

describe('armarReporteCalificaciones — retos del encargado', () => {
  it('participantes por banda, retos por orden, vacío como null y total', () => {
    const r = armarReporteCalificaciones(
      datos({
        retos: [
          { id: 'b', name: 'Entrevista', order_num: 2 },
          { id: 'a', name: 'Pasarela', order_num: 1 },
        ],
        participantes: [
          { id: 'p2', full_name: 'Bea', region: 'Sonora', sash_number: 2 },
          { id: 'p1', full_name: 'Ana', region: 'Jalisco', sash_number: 1 },
        ],
        puntosEncargado: [
          { participant_id: 'p1', challenge_id: 'a', score: 8 },
          { participant_id: 'p1', challenge_id: 'b', score: 9.5 },
          { participant_id: 'p2', challenge_id: 'b', score: 7 },
        ],
      }),
    )
    expect(r.retosEncargado.columnas).toEqual([
      'Banda',
      'Participante',
      'Región',
      'Pasarela',
      'Entrevista',
      'Total',
    ])
    expect(r.retosEncargado.filas).toEqual([
      [1, 'Ana', 'Jalisco', 8, 9.5, 17.5],
      [2, 'Bea', 'Sonora', null, 7, 7],
    ])
  })
})

describe('armarReporteCalificaciones — jueces', () => {
  const rondas = [
    { id: 'R2', stage_name: 'Top 5', stage_order: 2, status: 'abierta' as const },
    { id: 'R1', stage_name: 'Top 16', stage_order: 1, status: 'cerrada' as const },
  ]
  const puntajes = [
    juez('j2', 'Zoe', 'R1', 'p1', 1, 'r1', 8),
    juez('j1', 'Ana', 'R1', 'p1', 1, 'r1', 9),
    juez('j1', 'Ana', 'R1', 'p1', 1, 'r2', 10),
    juez('j1', 'Ana', 'R1', 'p2', 2, 'r1', 7),
    juez('j1', 'Ana', 'R2', 'p1', 1, 'r1', 6),
  ]

  it('secciones en orden de etapa', () => {
    const r = armarReporteCalificaciones(datos({ rondas, puntajesJueces: puntajes }))
    expect(r.rondas.map((s) => s.titulo)).toEqual([
      'Top 16 — ronda cerrada',
      'Top 5 — PRELIMINAR (ronda abierta)',
    ])
  })

  it('el detalle ordena por etapa, juez, banda y reto', () => {
    const r = armarReporteCalificaciones(datos({ rondas, puntajesJueces: puntajes }))
    const clave = r.detalleJueces.filas.map((f) => `${f[0]}|${f[2]}|${f[3]}|${f[6]}`)
    expect(clave).toEqual([
      'Top 16|Ana|1|Pasarela',
      'Top 16|Ana|1|Entrevista',
      'Top 16|Ana|2|Pasarela',
      'Top 16|Zoe|1|Pasarela',
      'Top 5|Ana|1|Pasarela',
    ])
  })

  it('el detalle descarta puntajes de rondas que no están en la lista', () => {
    const r = armarReporteCalificaciones(
      datos({ rondas, puntajesJueces: [juez('j1', 'Ana', 'otra', 'p1', 1, 'r1', 9)] }),
    )
    expect(r.detalleJueces.filas).toEqual([])
  })

  it('el resumen promedia SOLO dentro de su ronda', () => {
    const r = armarReporteCalificaciones(datos({ rondas, puntajesJueces: puntajes }))
    const top16 = r.rondas[0].resumen
    // p1 en R1: 8, 9, 10 → 9. El 6 de R2 no cuenta.
    const p1 = top16.filas.find((f) => f[1] === 1)
    expect(p1?.at(-3)).toBe(9)
    expect(p1?.at(-2)).toBe(3)
  })

  it('tabla por reto: jueces por nombre, hueco como null, promedio de presentes', () => {
    const r = armarReporteCalificaciones(datos({ rondas, puntajesJueces: puntajes }))
    const pasarela = r.rondas[0].porReto[0]
    expect(pasarela.titulo).toBe('Pasarela')
    expect(pasarela.columnas).toEqual(['Banda', 'Participante', 'Región', 'Ana', 'Zoe', 'Promedio'])
    expect(pasarela.filas).toEqual([
      [1, 'Participante 1', 'Jalisco', 9, 8, 8.5],
      [2, 'Participante 2', 'Jalisco', 7, null, 7],
    ])
  })
})

describe('celdaATexto', () => {
  it('null como guion, números sin ceros sobrantes', () => {
    expect(celdaATexto(null)).toBe('—')
    expect(celdaATexto(9.5)).toBe('9.5')
    expect(celdaATexto(8.333333)).toBe('8.33')
    expect(celdaATexto('Ana')).toBe('Ana')
  })
})
