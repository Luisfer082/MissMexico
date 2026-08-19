import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ParticipanteDirector } from '../stores/slices/directorSlice'
import { formatearPuntaje } from '../utils/puntaje'

interface Props {
  participante: ParticipanteDirector
  /** Posición en el ranking (1-based), la que se guarda en manual_rankings. */
  posicion: number
  /** Promedio de jueces en la ronda seleccionada. null = sin calificaciones. */
  promedio: number | null
  /** Suma de los puntos que capturó el encargado en toda la edición. */
  totalEncargado: number
}

// Fila arrastrable del ranking manual del director. Usa @dnd-kit/sortable
// (lista reordenable) a diferencia de los títulos, que son pool → slot fijo
// y se resuelven con @dnd-kit/core.
function FilaRanking({ participante, posicion, promedio, totalEncargado }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: participante.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-gray-200
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

      {/* Agarradera: es lo UNICO que arrastra. El resto de la fila queda libre
          para que el dedo pueda hacer scroll de la lista en tableta. */}
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Arrastrar para reordenar a ${participante.full_name}`}
        className="flex items-center justify-center w-11 h-11 -mr-1 flex-shrink-0 rounded-md
          text-slate-400 hover:text-slate-600 hover:bg-gray-100 touch-none
          cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </button>
    </li>
  )
}

export default FilaRanking
