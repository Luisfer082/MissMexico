// Extrae un mensaje legible de un error desconocido.
// Los errores de Supabase (PostgrestError, StorageError) son objetos planos
// con .message, NO instancias de Error, por eso `instanceof Error` no basta.
export function mensajeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim() !== '') return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message
    if (typeof m === 'string' && m.trim() !== '') return m
  }
  return fallback
}
