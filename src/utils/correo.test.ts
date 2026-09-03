import { describe, it, expect } from 'vitest'
import { sugerenciaDominio } from './correo'

// Las credenciales se entregan en mano y nadie abre ese buzón: un typo en el
// dominio solo se descubre cuando el juez no puede entrar, en pleno evento.
describe('sugerenciaDominio', () => {
  it('atrapa los typos frecuentes de gmail', () => {
    expect(sugerenciaDominio('juez@gmial.com')).toBe('gmail.com')
    expect(sugerenciaDominio('juez@gmil.com')).toBe('gmail.com')
    expect(sugerenciaDominio('juez@gmali.com')).toBe('gmail.com')
  })

  it('atrapa typos de hotmail y outlook', () => {
    expect(sugerenciaDominio('juez@hotmial.com')).toBe('hotmail.com')
    expect(sugerenciaDominio('juez@outlok.com')).toBe('outlook.com')
  })

  it('no molesta con dominios bien escritos', () => {
    expect(sugerenciaDominio('juez@gmail.com')).toBeNull()
    expect(sugerenciaDominio('juez@yahoo.com.mx')).toBeNull()
    expect(sugerenciaDominio('juez@prodigy.net.mx')).toBeNull()
  })

  it('NO confunde variantes legítimas entre sí', () => {
    // El caso que justifica el umbral de 2: outlook.es está a 3 de outlook.com
    // y yahoo.com.mx a 3 de yahoo.com. Si dispararan, la app estaría diciéndole
    // al encargado que corrija un correo que está bien.
    expect(sugerenciaDominio('juez@outlook.es')).toBeNull()
    expect(sugerenciaDominio('juez@hotmail.es')).toBeNull()
  })

  it('deja pasar un dominio propio que no se parece a ninguno', () => {
    expect(sugerenciaDominio('director@missmexico.mx')).toBeNull()
  })

  it('no truena con entradas incompletas', () => {
    expect(sugerenciaDominio('sinarroba')).toBeNull()
    expect(sugerenciaDominio('juez@')).toBeNull()
    expect(sugerenciaDominio('')).toBeNull()
  })

  it('ignora mayúsculas y espacios alrededor del dominio', () => {
    expect(sugerenciaDominio('juez@GMIAL.COM')).toBe('gmail.com')
  })
})
