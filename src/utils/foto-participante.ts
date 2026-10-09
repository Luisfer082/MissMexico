// Compresión en el navegador y subida de fotos de participantes a Supabase
// Storage. La BD solo guarda la URL pública resultante en participants.photo_url.

import { supabase } from '../lib/supabase'
import { BUCKET_FOTOS, rutaEnBucket, rutaMiniatura } from './url-foto'

// Ancho máximo del lado largo tras redimensionar. Una foto vertical de retrato
// a 800px de ancho ronda los 150–300 KB en JPEG, suficiente para lista y proyección.
const MAX_ANCHO = 800
// Miniatura para los avatares (Fase 11): ~10-15 KB. Cubre un avatar de 48px en
// pantallas 3x; con 32 participantes son ~400 KB por dispositivo en vez de ~8 MB.
const MAX_ANCHO_MINIATURA = 200
const CALIDAD_JPEG = 0.8
// Los nombres son UUID y nunca se sobrescriben (upsert: false), así que el
// navegador y el CDN pueden guardarlas un año sin riesgo de servir una vieja.
const CACHE_UN_ANIO = '31536000'

/** La foto lista para subir: la completa y su miniatura. */
export interface FotoComprimida {
  completa: Blob
  miniatura: Blob
}

// Dibuja la imagen a un ancho máximo en un <canvas> y la exporta a JPEG.
// Nunca agranda imágenes más chicas que el máximo.
function redimensionar(img: HTMLImageElement, maxAncho: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const escala = img.width > maxAncho ? maxAncho / img.width : 1
    const ancho = Math.round(img.width * escala)
    const alto = Math.round(img.height * escala)

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('No se pudo procesar la imagen'))
      return
    }
    ctx.drawImage(img, 0, 0, ancho, alto)

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('No se pudo comprimir la imagen'))
      },
      'image/jpeg',
      CALIDAD_JPEG,
    )
  })
}

// Decodifica la imagen una sola vez y saca de ella la foto completa y la
// miniatura. Sin dependencias externas.
export function comprimirImagen(file: File): Promise<FotoComprimida> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      Promise.all([redimensionar(img, MAX_ANCHO), redimensionar(img, MAX_ANCHO_MINIATURA)])
        .then(([completa, miniatura]) => resolve({ completa, miniatura }))
        .catch(reject)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('El archivo no es una imagen válida'))
    }

    img.src = objectUrl
  })
}

// Sube la foto y su miniatura al bucket y devuelve la URL pública de la
// completa (la de la miniatura se deriva de ella, ver utils/url-foto.ts).
// La ruta agrupa por edición y usa un UUID para evitar colisiones.
export async function subirFotoParticipante(foto: FotoComprimida, edicionId: string): Promise<string> {
  const ruta = `${edicionId}/${crypto.randomUUID()}.jpg`
  const opciones = { contentType: 'image/jpeg', upsert: false, cacheControl: CACHE_UN_ANIO }

  // Primero la completa: si falla, no queda una miniatura huérfana.
  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, foto.completa, opciones)
  if (error) throw error

  // La miniatura es una optimización: si falla, los avatares caen a la foto
  // completa (FotoParticipante), así que su error se ignora a propósito: sin
  // miniatura la app sigue funcionando, solo descarga más.
  await supabase.storage.from(BUCKET_FOTOS).upload(rutaMiniatura(ruta), foto.miniatura, opciones)

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta)
  return data.publicUrl
}

// Borra del bucket la foto que apunta una URL pública nuestra, junto con su
// miniatura. Si la URL no pertenece al bucket (p. ej. una URL externa pegada a
// mano), no hace nada. Borrar una miniatura inexistente (fotos anteriores a la
// Fase 11) no es error en Storage.
export async function borrarFotoParticipante(publicUrl: string): Promise<void> {
  const ruta = rutaEnBucket(publicUrl)
  if (ruta === null) return

  const { error } = await supabase.storage.from(BUCKET_FOTOS).remove([ruta, rutaMiniatura(ruta)])
  if (error) throw error
}
