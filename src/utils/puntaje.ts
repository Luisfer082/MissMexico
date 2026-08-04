// Formato compartido de puntajes entre las vistas del director.

/** Hasta 2 decimales, sin ceros sobrantes: 9.5 → "9.5", 9 → "9". */
export function formatearPuntaje(n: number): string {
  return Number(n.toFixed(2)).toString()
}
