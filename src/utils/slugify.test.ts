import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('convierte nombres de etapa reales', () => {
    expect(slugify('Semifinal 18')).toBe('semifinal-18')
    expect(slugify('Top 5')).toBe('top-5')
  })

  it('quita acentos y colapsa separadores', () => {
    expect(slugify('Traje típico')).toBe('traje-tipico')
    expect(slugify('Traje   de   noche')).toBe('traje-de-noche')
    expect(slugify('Pregunta & Respuesta')).toBe('pregunta-respuesta')
  })

  it('no deja guiones colgando en los extremos', () => {
    expect(slugify('  Preliminar  ')).toBe('preliminar')
    expect(slugify('¡Final!')).toBe('final')
  })

  it('devuelve cadena vacía si no queda nada aprovechable', () => {
    expect(slugify('')).toBe('')
    expect(slugify('!!!')).toBe('')
  })
})
