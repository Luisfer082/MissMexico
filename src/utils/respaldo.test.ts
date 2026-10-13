import { describe, expect, it } from 'vitest'
import { nombreArchivoRespaldo, TABLAS_RESPALDO } from './respaldo'

describe('nombreArchivoRespaldo', () => {
  it('usa la hora de México, no la de la máquina', () => {
    // 2026-10-14 01:30 UTC = 2026-10-13 19:30 en Ciudad de México (UTC-6)
    expect(nombreArchivoRespaldo(new Date('2026-10-14T01:30:00Z'))).toBe(
      'respaldo-2026-10-13_1930.json',
    )
  })
})

describe('TABLAS_RESPALDO', () => {
  it('cubre las 20 tablas de public', () => {
    expect(TABLAS_RESPALDO).toHaveLength(20)
  })
})
