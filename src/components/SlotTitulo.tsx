import { useDroppable } from '@dnd-kit/core'
import type { Tables } from '../types/database'
import type { ParticipanteDirector } from '../stores/slices/directorSlice'

interface Props {
  titulo: Tables<'titles'>
  /** Participante asignada al slot, o null si está vacío */
  participante: ParticipanteDirector | null
  /** Participante que el pool muestra en turno, o null si el pool está vacío */
  enTurno: ParticipanteDirector | null
  /** Asigna la participante en turno a este título (§5.9) */
  onAsignar: () => void
  onQuitar: () => void
}

// Slot de un título (pantalla Títulos del director).
//
// Dos formas de asignar (§5.9, Luis 2026-09-02):
//  - TOQUE: el slot ofrece un botón que le asigna la participante en turno del
//    pool. Es el camino principal y el único que funciona bien en celular.
//  - DRAG: sigue siendo droppable, como atajo en tableta y laptop.
//
// Trabaja sobre el BORRADOR del directorSlice: asignar/quitar no toca la BD
// hasta que se pulsa Guardar.
function SlotTitulo({ titulo, participante, enTurno, onAsignar, onQuitar }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: titulo.id })

  // Sin nadie en turno (pool vacío) no hay a quién asignar: el botón no aparece.
  const etiquetaEnTurno = enTurno ? `(${enTurno.sash_number}) ${enTurno.full_name}` : null

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
              {participante.sash_number}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 text-sm truncate">{participante.full_name}</p>
              <p className="text-slate-400 text-xs truncate">{participante.region}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {etiquetaEnTurno && (
              <button
                type="button"
                onClick={onAsignar}
                title={`Reemplazar por ${etiquetaEnTurno}`}
                className="px-3 min-h-[44px] text-xs font-medium text-brand-700 border border-brand-200
                  hover:bg-brand-50 rounded-md transition-colors"
              >
                Reemplazar
              </button>
            )}
            <button
              onClick={onQuitar}
              className="px-3 min-h-[44px] text-xs font-medium text-red-600 border border-red-200
                hover:bg-red-50 rounded-md transition-colors"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : etiquetaEnTurno ? (
        <button
          type="button"
          onClick={onAsignar}
          className="w-full min-h-[56px] rounded-lg border border-brand-200 bg-white px-3 py-2
            text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors
            focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Asignar a <span className="font-semibold">{etiquetaEnTurno}</span>
        </button>
      ) : (
        <p className="text-slate-400 text-xs min-h-[56px] flex items-center justify-center text-center select-none">
          Sin participantes disponibles
        </p>
      )}
    </div>
  )
}

export default SlotTitulo
