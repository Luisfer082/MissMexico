import { describe, expect, it } from 'vitest'
import { rutaEnBucket, rutaMiniatura, urlMiniatura } from './url-foto'

const BASE = 'https://abc.supabase.co/storage/v1/object/public/fotos-participantes'

describe('urlMiniatura', () => {
  it('deriva la miniatura de una foto del bucket', () => {
    expect(urlMiniatura(`${BASE}/ed1/uuid.jpg`)).toBe(`${BASE}/ed1/uuid_thumb.jpg`)
  })

  it('no aplica a URLs externas', () => {
    expect(urlMiniatura('https://ejemplo.com/foto.jpg')).toBeNull()
  })

  it('no aplica si no es .jpg', () => {
    expect(urlMiniatura(`${BASE}/ed1/uuid.png`)).toBeNull()
  })
})

describe('rutaMiniatura', () => {
  it('solo cambia la extensión final', () => {
    expect(rutaMiniatura('ed.jpg/uuid.jpg')).toBe('ed.jpg/uuid_thumb.jpg')
  })
})

describe('rutaEnBucket', () => {
  it('extrae la ruta dentro del bucket', () => {
    expect(rutaEnBucket(`${BASE}/ed1/uuid.jpg`)).toBe('ed1/uuid.jpg')
  })

  it('devuelve null para URLs externas', () => {
    expect(rutaEnBucket('https://ejemplo.com/foto.jpg')).toBeNull()
  })
})
