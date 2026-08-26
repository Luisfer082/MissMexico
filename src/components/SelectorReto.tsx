import { useEffect, useRef } from 'react'
import type { RetoRonda } from '../hooks/useRondaJuez'

export interface AvanceReto {
  calificadas: number
  total: number
}

interface Props {
  retos: RetoRonda[]
  retoActivoId: string
  avancePorReto: Record<string, AvanceReto>
  onSeleccionar: (retoId: string) => void
}

// Selector de reto del módulo juez. La ronda puede tener cualquier cantidad de
// retos (son los que tenga la etapa), así que la tira scrollea en horizontal en
// vez de repartirse el ancho: con 6 retos unos tabs equirepartidos quedarían de
// ~60px en celular. Las flechas ‹ › permiten avanzar sin atinarle al tab.
function SelectorReto({ retos, retoActivoId, avancePorReto, onSeleccionar }: Props) {
  const tiraRef = useRef<HTMLDivElement>(null)
  const indice = retos.findIndex((r) => r.id === retoActivoId)

  // Traer el tab activo a la vista: al avanzar con las flechas puede estar
  // fuera del área visible de la tira.
  useEffect(() => {
    const tira = tiraRef.current
    if (!tira) return
    const activo = tira.querySelector<HTMLElement>('[data-activo="true"]')
    activo?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [retoActivoId])

  if (retos.length === 0) return null

  const irA = (delta: number) => {
    const destino = retos[indice + delta]
    if (destino) onSeleccionar(destino.id)
  }

  const flecha = (delta: number, etiqueta: string, d: string) => {
    const deshabilitada = !retos[indice + delta]
    return (
      <button
        type="button"
        onClick={() => irA(delta)}
        disabled={deshabilitada}
        aria-label={etiqueta}
        className="flex-shrink-0 inline-flex items-center justify-center w-9 min-h-[44px] rounded-lg
          text-slate-500 hover:text-slate-900 hover:bg-gray-100 disabled:opacity-30
          disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
      </button>
    )
  }

  return (
    <div className="flex items-stretch gap-1">
      {flecha(-1, 'Reto anterior', 'M15 19l-7-7 7-7')}

      <div
        ref={tiraRef}
        role="tablist"
        aria-label="Retos de la ronda"
        className="flex-1 flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {retos.map((reto) => {
          const activo = reto.id === retoActivoId
          const avance = avancePorReto[reto.id] ?? { calificadas: 0, total: 0 }
          const completo = avance.total > 0 && avance.calificadas === avance.total
          return (
            <button
              key={reto.id}
              type="button"
              role="tab"
              aria-selected={activo}
              data-activo={activo}
              onClick={() => onSeleccionar(reto.id)}
              className={`flex-shrink-0 snap-center px-4 min-h-[44px] rounded-lg border text-sm font-semibold
                transition-colors ${
                  activo
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-gray-300 text-slate-600 hover:bg-gray-50'
                }`}
            >
              <span className="block max-w-[10rem] truncate">{reto.name}</span>
              <span
                className={`block text-xs font-medium ${
                  activo ? 'text-brand-100' : completo ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {completo ? '✓ ' : ''}
                {avance.calificadas}/{avance.total}
              </span>
            </button>
          )
        })}
      </div>

      {flecha(1, 'Reto siguiente', 'M9 5l7 7-7 7')}
    </div>
  )
}

export default SelectorReto
