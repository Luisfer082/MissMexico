// Convierte un texto en un slug URL-friendly: minúsculas, sin acentos y con
// guiones en lugar de espacios. Ej: "Semifinal 18" -> "semifinal-18".
export function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD') // separa cada letra de su acento
    .replace(/[̀-ͯ]/g, '') // elimina las marcas de acento combinantes
    .replace(/[^a-z0-9]+/g, '-') // todo lo no alfanumérico pasa a guion
    .replace(/^-+|-+$/g, '') // quita guiones sobrantes en los extremos
}
