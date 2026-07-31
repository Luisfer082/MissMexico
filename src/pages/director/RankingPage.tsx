// Pantalla Ranking del director (§5.5, paso 3).
//
// Un solo ranking manual de TODAS las participantes de la edición, ordenado a
// mano con drag. NO toca los puntos de los jueces: es una capa aparte que vive
// en manual_rankings. Los cambios quedan en el borrador del store hasta que se
// pulsa Guardar (barra del layout).

import { useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useAppStore } from '../../stores/useAppStore'
import FilaRanking from '../../components/FilaRanking'

function RankingPage() {
  const loading = useAppStore((s) => s.directorLoading)
  const error = useAppStore((s) => s.directorError)
  const participantes = useAppStore((s) => s.directorParticipantes)
  const ranking = useAppStore((s) => s.directorRanking)
  const reordenar = useAppStore((s) => s.reordenarRanking)
  const recargar = useAppStore((s) => s.recargarDirector)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const porId = useMemo(
    () => new Map(participantes.map((p) => [p.id, p])),
    [participantes],
  )

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const destino = ranking.indexOf(String(e.over.id))
    if (destino === -1) return
    reordenar(String(e.active.id), destino)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-red-600 font-medium">Error al cargar el ranking</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <button
          onClick={() => void recargar()}
          className="px-4 py-1.5 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-700 font-medium">Esta edición no tiene participantes</p>
        <p className="text-slate-400 text-sm mt-1">
          El encargado debe registrarlas para poder armar el ranking.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Ranking</h1>
        <p className="text-slate-500 text-sm mt-1">
          {ranking.length} participantes — arrastra para reordenar
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={ranking} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {ranking.map((id, i) => {
              const participante = porId.get(id)
              if (!participante) return null
              return <FilaRanking key={id} participante={participante} posicion={i + 1} />
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <p className="text-xs text-slate-400 mt-4">
        Este ranking es manual y no modifica los puntos de los jueces. Los cambios no se guardan
        hasta que pulses Guardar.
      </p>
    </div>
  )
}

export default RankingPage
