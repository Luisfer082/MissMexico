import { describe, it, expect } from 'vitest'
import { normalizar } from './texto'

// Lo usa la búsqueda de participantes del Juez y el pool de Títulos. Si falla,
// el juez escribe "monica" en vivo y no encuentra a Mónica.
describe('normalizar', () => {
  it('ignora mayúsculas y acentos', () => {
    expect(normalizar('Mónica')).toBe('monica')
    expect(normalizar('MÓNICA')).toBe(normalizar('monica'))
  })

  it('cubre los acentos que aparecen en nombres y regiones mexicanas', () => {
    expect(normalizar('Nuevo León')).toBe('nuevo leon')
    expect(normalizar('Michoacán')).toBe('michoacan')
    expect(normalizar('Yucatán')).toBe('yucatan')
  })

  it('pliega la ñ a n, a propósito', () => {
    // NFD descompone la ñ en n + virgulilla combinante, que cae en el rango que
    // se borra. Es DESEABLE en un buscador: quien teclea "pena" encuentra a
    // "Peña", y en vivo el juez escribe rápido y sin acentos. El precio es que
    // "Peña" y "Pena" colisionan, lo cual da más resultados, nunca menos.
    expect(normalizar('Peña')).toBe('pena')
    expect(normalizar('Peña')).toBe(normalizar('Pena'))
  })

  it('conserva espacios y no rompe con cadena vacía', () => {
    expect(normalizar('  Ana  ')).toBe('  ana  ')
    expect(normalizar('')).toBe('')
  })
})
