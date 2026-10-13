import { useState } from 'react'
import Modal from './Modal'
import { urlMiniatura } from '../utils/url-foto'

// URLs que fallaron con red, compartidas por TODA la app. Sin esto, cada
// pantalla volvía a pedir la miniatura inexistente de las fotos subidas antes
// de la Fase 11 (un 404 por foto en cada navegación). Vive lo que la pestaña.
const URLS_FALLIDAS = new Set<string>()

interface Props {
  nombre: string
  photoUrl: string | null
  /** Lo que se pinta sin foto (número de banda o inicial), como hasta la Fase 11. */
  fallback: React.ReactNode
  /** Tamaño y forma, p. ej. 'w-8 h-8 rounded-full'. Aplica con y sin foto. */
  className: string
  /** Color y tipografía del recuadro sin foto. */
  claseFallback?: string
  /** Número de banda en una esquina cuando sí hay foto: el juez identifica por banda. */
  banda?: number
  /** Tocar el avatar abre la foto completa. */
  ampliable?: boolean
}

// Avatar de participante (Fase 11). Prueba en cadena: miniatura → foto completa
// → fallback. La miniatura no existe en fotos subidas antes de la Fase 11, y
// con el juez offline puede no cargar ninguna: en los dos casos cae solo al
// siguiente paso y nunca deja el hueco vacío.
function FotoParticipante({
  nombre,
  photoUrl,
  fallback,
  className,
  claseFallback = 'bg-brand-100 text-brand-700 text-xs font-bold',
  banda,
  ampliable = false,
}: Props) {
  // Fallas de ESTE avatar. Se guarda la URL y no un índice para que, si cambia
  // la foto de la participante, se intente de nuevo sin efecto de reseteo.
  const [fallidas, setFallidas] = useState<string[]>([])
  const fallo = (u: string) => fallidas.includes(u) || URLS_FALLIDAS.has(u)

  const registrarFallo = (u: string) => {
    // Sin red (juez offline) la falla es pasajera: no se recuerda para toda la
    // app, o la foto no volvería a intentarse al recuperar la conexión.
    if (navigator.onLine) URLS_FALLIDAS.add(u)
    setFallidas((prev) => [...prev, u])
  }
  const [ampliada, setAmpliada] = useState(false)

  const candidatas = photoUrl ? [urlMiniatura(photoUrl), photoUrl] : []
  const src = candidatas.find((u): u is string => u !== null && !fallo(u)) ?? null

  const avatar =
    src !== null ? (
      <span className={`relative inline-block flex-shrink-0 ${className}`}>
        <img
          src={src}
          alt={`Foto de ${nombre}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => registrarFallo(src)}
          // El radio se hereda del contenedor: recortar con overflow-hidden ahí
          // cortaría también el número de banda, que sobresale de la esquina.
          className="w-full h-full object-cover bg-brand-100 rounded-[inherit]"
        />
        {banda !== undefined && (
          <span
            className="absolute -bottom-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-0.5 rounded-full
              bg-brand-700 text-white text-[10px] font-bold leading-[1.125rem] text-center ring-2 ring-white"
          >
            {banda}
          </span>
        )}
      </span>
    ) : (
      <span
        className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className} ${claseFallback}`}
      >
        {fallback}
      </span>
    )

  // Sin foto que ampliar (o si la completa ya falló) el avatar es solo visual.
  if (!ampliable || !photoUrl || fallo(photoUrl)) return avatar

  // Los eventos se cortan aquí porque el avatar vive dentro de filas
  // arrastrables (director): sin esto, tocarlo o tocar dentro del visor
  // arrancaría el drag de la fila. Los eventos de React suben por el árbol de
  // componentes, no por el DOM, así que también cubre al <dialog> del visor.
  return (
    <span
      className="contents"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setAmpliada(true)}
        aria-label={`Ver foto de ${nombre}`}
        className="flex-shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {avatar}
      </button>
      {ampliada && (
        <Modal titulo={nombre} onClose={() => setAmpliada(false)}>
          <img
            src={photoUrl}
            alt={`Foto de ${nombre}`}
            className="block w-full h-auto max-h-[75vh] object-contain bg-slate-100"
          />
        </Modal>
      )}
    </span>
  )
}

export default FotoParticipante
