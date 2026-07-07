import { useDroppable } from '@dnd-kit/core'
import type { Tables } from '../types/database'
import type { ParticipanteTitulos } from '../hooks/useTitulos'

interface Props {
  titulo: Tables<'titles'>
  /** Participante asignada al slot, o null si está vacío */
  participante: ParticipanteTitulos | null
  /** true cuando la asignación ya fue aprobada (slot congelado) */
  aprobado: boolean
  onQuitar: () => void
}

// Slot droppable de un título (pantalla Títulos del director, Fase 6).
// Recibe el drop de una participante del pool; muestra la asignada actual.
function SlotTitulo({ titulo, participante, aprobado, onQuitar }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: titulo.id, disabled: aprobado })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 p-3 transition-colors ${
        isOver
          ? 'border-brand-500 bg-brand-50'
          : participante
            ? 'border-gray-200 bg-white'
            : 'border-dashed border-gray-300 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-semibold text-slate-900 text-sm truncate">{titulo.name}</p>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
            titulo.kind === 'titulo' ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {titulo.kind === 'titulo' ? 'Título' : 'Finalista'}
        </span>
      </div>

      {participante ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
              {participante.sash_number}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 text-sm truncate">{participante.full_name}</p>
              <p className="text-slate-400 text-xs truncate">{participante.region}</p>
            </div>
          </div>
          {aprobado ? (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
              Aprobada
            </span>
          ) : (
            <button
              onClick={onQuitar}
              className="px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200
                hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
            >
              Quitar
            </button>
          )}
        </div>
      ) : (
        <p className="text-slate-400 text-xs py-2 text-center select-none">
          Arrastra una participante aquí
        </p>
      )}
    </div>
  )
}

export default SlotTitulo
