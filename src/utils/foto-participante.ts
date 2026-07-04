// Compresión en el navegador y subida de fotos de participantes a Supabase
// Storage. La BD solo guarda la URL pública resultante en participants.photo_url.

import { supabase } from '../lib/supabase'

const BUCKET = 'fotos-participantes'
// Ancho máximo del lado largo tras redimensionar. Una foto vertical de retrato
// a 800px de ancho ronda los 150–300 KB en JPEG, suficiente para lista y proyección.
const MAX_ANCHO = 800
const CALIDAD_JPEG = 0.8

// Redimensiona y comprime una imagen usando un <canvas>. Sin dependencias
// externas. Devuelve un Blob JPEG. Nunca agranda imágenes más chicas que MAX_ANCHO.
export function comprimirImagen(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const escala = img.width > MAX_ANCHO ? MAX_ANCHO / img.width : 1
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
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('El archivo no es una imagen válida'))
    }

    img.src = objectUrl
  })
}

// Sube un blob ya comprimido al bucket y devuelve la URL pública.
// La ruta agrupa por edición y usa un UUID para evitar colisiones.
export async function subirFotoParticipante(blob: Blob, edicionId: string): Promise<string> {
  const ruta = `${edicionId}/${crypto.randomUUID()}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, blob, { contentType: 'image/jpeg', upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta)
  return data.publicUrl
}

// Borra del bucket la foto que apunta una URL pública nuestra. Si la URL no
// pertenece al bucket (p. ej. una URL externa pegada a mano), no hace nada.
export async function borrarFotoParticipante(publicUrl: string): Promise<void> {
  const marcador = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marcador)
  if (idx === -1) return

  const ruta = decodeURIComponent(publicUrl.slice(idx + marcador.length))
  const { error } = await supabase.storage.from(BUCKET).remove([ruta])
  if (error) throw error
}
