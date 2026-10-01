// Código de Postgres para "duplicate key value violates unique constraint".
const UNIQUE_VIOLATION = '23505'

// Mensajes en español por restricción unique. Los nombres son los que Postgres
// asigna por defecto (<tabla>_<columnas>_key) a los unique de las migraciones;
// si una migración nueva renombra o agrega uno, se registra aquí.
const MENSAJES_DUPLICADO: Record<string, string> = {
  participants_edition_id_sash_number_key: 'Esa banda ya está en uso en esta edición',
  challenges_edition_id_order_num_key: 'Ya hay un reto con ese orden',
  stages_edition_id_order_num_key: 'Ya hay una etapa con ese orden',
  // El slug se genera del nombre: chocan dos etapas con el mismo nombre.
  stages_edition_id_slug_key: 'Ya hay una etapa con ese nombre',
  titles_edition_id_order_num_key: 'Ya hay un título con ese orden',
  titles_edition_id_name_key: 'Ya existe un título con ese nombre',
  editions_only_one_active: 'Ya hay otra edición activa. Recarga la página e intenta de nuevo',
}

const MENSAJE_DUPLICADO_GENERICO = 'Ese valor ya existe'

// Traduce una violación de unique a un mensaje para el usuario. Devuelve null
// si el error no es de ese tipo.
function mensajeDuplicado(err: object): string | null {
  if (!('code' in err) || err.code !== UNIQUE_VIOLATION) return null
  const texto = 'message' in err && typeof err.message === 'string' ? err.message : ''
  const restriccion = /unique constraint "([^"]+)"/.exec(texto)?.[1]
  return (restriccion && MENSAJES_DUPLICADO[restriccion]) || MENSAJE_DUPLICADO_GENERICO
}

// Extrae un mensaje legible de un error desconocido.
// Los errores de Supabase (PostgrestError, StorageError) son objetos planos
// con .message, NO instancias de Error, por eso `instanceof Error` no basta.
export function mensajeError(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const duplicado = mensajeDuplicado(err)
    if (duplicado) return duplicado
  }
  if (err instanceof Error && err.message.trim() !== '') return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message
    if (typeof m === 'string' && m.trim() !== '') return m
  }
  return fallback
}
