import { describe, it, expect } from 'vitest'
import { mensajeError } from './mensaje-error'

// Forma de un PostgrestError: objeto plano, no instancia de Error.
function errorPostgres(code: string, message: string) {
  return { code, message, details: '', hint: '' }
}

describe('mensajeError', () => {
  it('traduce un duplicado conocido a un mensaje en español', () => {
    const err = errorPostgres(
      '23505',
      'duplicate key value violates unique constraint "participants_edition_id_sash_number_key"',
    )
    expect(mensajeError(err, 'Error al guardar')).toBe('Esa banda ya está en uso en esta edición')
  })

  it('distingue el orden de reto del orden de etapa', () => {
    const reto = errorPostgres(
      '23505',
      'duplicate key value violates unique constraint "challenges_edition_id_order_num_key"',
    )
    const etapa = errorPostgres(
      '23505',
      'duplicate key value violates unique constraint "stages_edition_id_order_num_key"',
    )
    expect(mensajeError(reto, 'x')).toBe('Ya hay un reto con ese orden')
    expect(mensajeError(etapa, 'x')).toBe('Ya hay una etapa con ese orden')
  })

  it('un duplicado sin mapear nunca muestra el texto técnico', () => {
    const err = errorPostgres(
      '23505',
      'duplicate key value violates unique constraint "tabla_nueva_columna_key"',
    )
    expect(mensajeError(err, 'x')).toBe('Ese valor ya existe')
  })

  it('los demás errores de Postgres conservan su mensaje', () => {
    const err = errorPostgres('P0001', 'La ronda está cerrada')
    expect(mensajeError(err, 'x')).toBe('La ronda está cerrada')
  })

  it('usa el mensaje de un Error y el fallback si no hay nada útil', () => {
    expect(mensajeError(new Error('Sin conexión'), 'x')).toBe('Sin conexión')
    expect(mensajeError({ message: '  ' }, 'Error al guardar')).toBe('Error al guardar')
    expect(mensajeError(null, 'Error al guardar')).toBe('Error al guardar')
  })
})
