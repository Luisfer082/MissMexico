import { describe, it, expect } from 'vitest'
import { formatearPuntaje } from './puntaje'

// Es el formato con el que el director lee los promedios en pantalla: un
// redondeo mal hecho aquí se ve como una participante por encima de otra.
describe('formatearPuntaje', () => {
  it('quita los ceros sobrantes', () => {
    expect(formatearPuntaje(9)).toBe('9')
    expect(formatearPuntaje(9.5)).toBe('9.5')
    expect(formatearPuntaje(9.5)).not.toBe('9.50')
  })

  it('redondea a 2 decimales', () => {
    expect(formatearPuntaje(9.456)).toBe('9.46')
    expect(formatearPuntaje(9.454)).toBe('9.45')
  })

  it('no pierde decimales de un promedio periódico', () => {
    // 28/3 = 9.333… es el caso real: 3 jueces, notas 9, 9.5 y 9.5.
    expect(formatearPuntaje((9 + 9.5 + 9.5) / 3)).toBe('9.33')
  })

  it('formatea el cero y los enteros grandes', () => {
    expect(formatearPuntaje(0)).toBe('0')
    expect(formatearPuntaje(100)).toBe('100')
  })
})
