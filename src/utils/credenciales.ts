// Alfabeto sin caracteres ambiguos: la contraseña se dicta o se copia a mano
// en el evento, así que fuera 0/O, 1/l/I y símbolos que se pierden al leerlas.
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const LARGO = 12

// crypto.getRandomValues y no Math.random: son credenciales de acceso reales.
export function generarPassword(): string {
  const valores = new Uint32Array(LARGO)
  crypto.getRandomValues(valores)

  let salida = ''
  for (const v of valores) salida += ALFABETO[v % ALFABETO.length]
  return salida
}

// Devuelve false si el navegador no da permiso al portapapeles (contexto no
// seguro): quien llama muestra el texto para copiarlo a mano.
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}
