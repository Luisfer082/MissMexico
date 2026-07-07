// Normaliza texto para búsqueda: minúsculas y sin acentos ("Mónica" ≈ "monica").
// Usado por la búsqueda de participantes del módulo Juez y el pool de la
// pantalla Títulos del Director.
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
