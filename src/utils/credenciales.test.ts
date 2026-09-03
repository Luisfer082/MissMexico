import { describe, it, expect } from 'vitest'
import { generarPassword } from './credenciales'

// La contraseña se dicta o se copia a mano durante el evento.
describe('generarPassword', () => {
  it('tiene 12 caracteres', () => {
    expect(generarPassword()).toHaveLength(12)
  })

  it('no usa caracteres ambiguos al dictarla', () => {
    // 0/O, 1/l/I y símbolos quedaron fuera a propósito.
    const prohibidos = /[0O1lI]/
    for (let i = 0; i < 200; i++) {
      expect(generarPassword()).not.toMatch(prohibidos)
    }
  })

  it('solo usa alfanuméricos del alfabeto declarado', () => {
    for (let i = 0; i < 50; i++) {
      expect(generarPassword()).toMatch(/^[a-zA-Z2-9]{12}$/)
    }
  })

  it('no repite: 500 contraseñas dan 500 valores distintos', () => {
    const vistas = new Set<string>()
    for (let i = 0; i < 500; i++) vistas.add(generarPassword())
    expect(vistas.size).toBe(500)
  })
})
