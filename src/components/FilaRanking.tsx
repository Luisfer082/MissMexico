import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ParticipanteDirector } from '../stores/slices/directorSlice'
import { formatearPuntaje } from '../utils/puntaje'

interface ContenidoProps {
  participante: ParticipanteDirector
  /** Posición en el ranking (1-based), la que se guarda en manual_rankings. */
  posicion: number
  /** Promedio de jueces en la ronda seleccionada. null = sin calificaciones. */
  promedio: number | null
  /** Suma de los puntos que capturó el encargado en toda la edición. */
  totalEncargado: number
}

// Contenido visual de la fila, sin nada de drag. Se comparte entre la fila real
// y la copia que se pinta en el DragOverlay mientras se arrastra.
export function ContenidoFila({
  participante,
  posicion,
  promedio,
  totalEncargado,
}: ContenidoProps) {
  return (
    <>
      <span className="w-6 text-right text-sm font-bold text-slate-400 flex-shrink-0 tabular-nums">
        {posicion}
      </span>
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
        {participante.sash_number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900 text-sm truncate">{participante.full_name}</p>
        <p className="text-slate-400 text-xs truncate">{participante.region}</p>
      </div>

      {/* Puntajes de referencia: no se editan aquí, solo orientan el orden manual */}
      <div className="flex items-center gap-4 flex-shrink-0 text-right">
        <div className="w-14">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 leading-none">Jueces</p>
          <p className="text-sm font-semibold text-brand-700 tabular-nums leading-tight">
            {promedio === null ? <span className="text-slate-300">—</span> : formatearPuntaje(promedio)}
          </p>
        </div>
        <div className="w-14">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 leading-none">Encargado</p>
          <p className="text-sm font-semibold text-slate-700 tabular-nums leading-tight">
            {formatearPuntaje(totalEncargado)}
          </p>
        </div>
      </div>

      <svg
        className="w-5 h-5 text-slate-300 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
      </svg>
    </>
  )
}

/** Clases compartidas por la fila real y la del overlay, para que se vean igual. */
export const CLASES_FILA =
  'flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-gray-200'

// Fila arrastrable del ranking manual del director. Usa @dnd-kit/sortable
// (lista reordenable) a diferencia de los títulos, que son pool → slot fijo
// y se resuelven con @dnd-kit/core.
//
// Los listeners van en TODA la fila (Luis, 2026-08-21: arrastrar solo desde la
// agarradera no se sentía natural). Lo que evita que el gesto le robe el scroll
// es el TouchSensor con `delay` del DndContext: en táctil hay que mantener
// presionado para arrastrar, y un deslizamiento corto sigue haciendo scroll.
function FilaRanking(props: ContenidoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.participante.id,
  })

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // touch-manipulation (no touch-none): deja pasar el scroll y solo bloquea
      // el doble-tap para zoom. El drag lo activa el delay del TouchSensor.
      className={`${CLASES_FILA} cursor-grab active:cursor-grabbing touch-manipulation select-none
        ${isDragging ? 'opacity-40' : ''}`}
    >
      <ContenidoFila {...props} />
    </li>
  )
}

export default FilaRanking
