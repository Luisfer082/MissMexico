import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ParticipanteDirector } from '../stores/slices/directorSlice'

interface Props {
  participante: ParticipanteDirector
  /** Posición en el ranking (1-based), la que se guarda en manual_rankings. */
  posicion: number
}

// Fila arrastrable del ranking manual del director. Usa @dnd-kit/sortable
// (lista reordenable) a diferencia de los títulos, que son pool → slot fijo
// y se resuelven con @dnd-kit/core.
function FilaRanking({ participante, posicion }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: participante.id,
  })

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-gray-200
        cursor-grab active:cursor-grabbing touch-none
        ${isDragging ? 'z-10 relative shadow-lg ring-2 ring-brand-400' : ''}`}
    >
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
      <svg
        className="w-4 h-4 text-slate-300 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
      </svg>
    </li>
  )
}

export default FilaRanking
