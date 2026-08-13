// Detección de dominios de correo mal escritos.
//
// Zod valida la FORMA del correo, no que el dominio exista: "juez@gmli.com"
// pasa cualquier validación sintáctica. Como las credenciales se entregan en
// mano y nadie va a abrir ese buzón, un typo aquí no se detecta nunca -- solo
// se descubre cuando el juez no puede entrar. De ahí este chequeo.

// Dominios de correo de uso común en México. La lista no pretende ser
// exhaustiva: solo sirve de referencia para medir parecidos.
const DOMINIOS_CONOCIDOS = [
  'gmail.com',
  'hotmail.com',
  'hotmail.es',
  'outlook.com',
  'outlook.es',
  'yahoo.com',
  'yahoo.com.mx',
  'live.com',
  'live.com.mx',
  'icloud.com',
  'me.com',
  'msn.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'prodigy.net.mx',
]

// Distancia de edición con transposición (Damerau-Levenshtein, variante OSA).
// La transposición importa: "gmial"/"gmai" son de los typos más frecuentes y
// una Levenshtein normal los mide más lejos de lo que realmente están.
function distancia(a: string, b: string): number {
  const filas = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: filas }, () => new Array<number>(cols).fill(0))

  for (let i = 0; i < filas; i++) d[i][0] = i
  for (let j = 0; j < cols; j++) d[0][j] = j

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < cols; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // borrado
        d[i][j - 1] + 1,      // inserción
        d[i - 1][j - 1] + costo, // sustitución
      )
      // Transposición de dos caracteres adyacentes.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }

  return d[a.length][b.length]
}

// Umbral de parecido. Con 2 se atrapan los typos reales (gmli.com, hotmial.com,
// gmail.co) sin tocar dominios legítimos distintos: "outlook.es" está a 3 de
// "outlook.com" y "yahoo.com.mx" a 3 de "yahoo.com", así que no disparan.
const MAX_DISTANCIA = 2

// Devuelve el dominio correcto si el escrito parece un typo de uno conocido.
// null = o está bien escrito, o es un dominio propio que no se parece a ninguno
// (un corporativo como @missmexico.mx pasa sin problema).
export function sugerenciaDominio(correo: string): string | null {
  const dominio = correo.split('@')[1]?.trim().toLowerCase()
  if (!dominio) return null

  // Un dominio corto da falsos positivos: casi todo se parece a todo.
  if (dominio.length < 5) return null
  if (DOMINIOS_CONOCIDOS.includes(dominio)) return null

  let mejor: string | null = null
  let mejorDistancia = MAX_DISTANCIA + 1

  for (const conocido of DOMINIOS_CONOCIDOS) {
    const d = distancia(dominio, conocido)
    if (d < mejorDistancia) {
      mejorDistancia = d
      mejor = conocido
    }
  }

  return mejorDistancia <= MAX_DISTANCIA ? mejor : null
}
