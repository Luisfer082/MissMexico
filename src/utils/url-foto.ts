// Rutas de las fotos de participantes (Fase 11). Puro: sin Supabase, para que
// lo usen los componentes de cualquier rol y se pueda probar en Node.

export const BUCKET_FOTOS = 'fotos-participantes'

/** Sufijo de la miniatura: `<uuid>.jpg` → `<uuid>_thumb.jpg`. */
const SUFIJO_MINIATURA = '_thumb'

const MARCADOR_PUBLICO = `/object/public/${BUCKET_FOTOS}/`

/** Ruta de la miniatura a partir de la ruta de la foto completa dentro del bucket. */
export function rutaMiniatura(ruta: string): string {
  return ruta.replace(/\.jpg$/i, `${SUFIJO_MINIATURA}.jpg`)
}

/**
 * URL de la miniatura de una foto nuestra, o null si no aplica: una URL externa
 * pegada a mano, o una que no termina en .jpg, no tiene miniatura.
 *
 * La URL se DERIVA de la original en vez de guardarse en otra columna: así no
 * hace falta migración. Las fotos subidas antes de la Fase 11 no tienen
 * miniatura en el bucket; quien la pinte debe caer a la completa si falla.
 */
export function urlMiniatura(url: string): string | null {
  if (!url.includes(MARCADOR_PUBLICO)) return null
  if (!/\.jpg$/i.test(url)) return null
  return rutaMiniatura(url)
}

/** Ruta dentro del bucket de una URL pública nuestra, o null si es externa. */
export function rutaEnBucket(url: string): string | null {
  const idx = url.indexOf(MARCADOR_PUBLICO)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + MARCADOR_PUBLICO.length))
}
