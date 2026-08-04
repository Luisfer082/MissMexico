// Pantalla Ranking del director (§5.5, paso 3).
//
// Un solo ranking manual de TODAS las participantes de la edición, ordenado a
// mano con drag. NO toca los puntos de los jueces: es una capa aparte que vive
// en manual_rankings. Los cambios quedan en el borrador del store hasta que se
// pulsa Guardar (barra del layout).
//
// Cada fila muestra el promedio de jueces de la ronda seleccionada y los puntos
// del encargado, como referencia para ordenar (Luis, 2026-08-04). La ronda es
// la misma que en Promedios: vive en el store, compartida por las tres tabs.

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
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import { usePromediosDirector } from '../../hooks/usePromediosDirector'
import FilaRanking from '../../components/FilaRanking'

function RankingPage() {
  const loading = useAppStore((s) => s.directorLoading)
  const error = useAppStore((s) => s.directorError)
  const participantes = useAppStore((s) => s.directorParticipantes)
  const ranking = useAppStore((s) => s.directorRanking)
  const reordenar = useAppStore((s) => s.reordenarRanking)
  const reemplazarRanking = useAppStore((s) => s.reemplazarRanking)
  const recargar = useAppStore((s) => s.recargarDirector)

  const rondaSeleccionada = useAppStore((s) => s.directorRondaId)
  const setRondaSeleccionada = useAppStore((s) => s.setDirectorRonda)

  const { edicion } = useEdicionActiva()
  const { rondas, puntajes, totalesEncargado } = usePromediosDirector(edicion?.id)

  const rondaEfectiva = useMemo(() => {
    if (rondas.some((r) => r.id === rondaSeleccionada)) return rondaSeleccionada ?? ''
    return rondas[0]?.id ?? ''
  }, [rondas, rondaSeleccionada])

  // participant_id -> promedio de jueces en la ronda seleccionada
  const promedios = useMemo(() => {
    const acc = new Map<string, { suma: number; cuenta: number }>()
    for (const p of puntajes) {
      if (p.round_id !== rondaEfectiva) continue
      const v = acc.get(p.participant_id) ?? { suma: 0, cuenta: 0 }
      v.suma += p.score
      v.cuenta += 1
      acc.set(p.participant_id, v)
    }
    return new Map([...acc].map(([id, v]) => [id, v.suma / v.cuenta]))
  }, [puntajes, rondaEfectiva])

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

  // Reordena el borrador por promedio desc. Las que no tienen calificación en
  // la ronda quedan al final, por número de banda. Sigue siendo editable a mano.
  const ordenarPorPromedio = () => {
    const ordenado = [...ranking].sort((a, b) => {
      const pa = promedios.get(a)
      const pb = promedios.get(b)
      if (pa === undefined && pb === undefined) {
        return (porId.get(a)?.sash_number ?? 0) - (porId.get(b)?.sash_number ?? 0)
      }
      if (pa === undefined) return 1
      if (pb === undefined) return -1
      if (pb !== pa) return pb - pa
      return (porId.get(a)?.sash_number ?? 0) - (porId.get(b)?.sash_number ?? 0)
    })
    reemplazarRanking(ordenado)
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

      {/* Ronda de referencia + ordenamiento automático */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {rondas.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <label
                htmlFor="ronda-ranking"
                className="text-sm font-medium text-slate-700 whitespace-nowrap"
              >
                Ronda:
              </label>
              <select
                id="ronda-ranking"
                value={rondaEfectiva}
                onChange={(e) => setRondaSeleccionada(e.target.value)}
                className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {rondas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.stage_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={ordenarPorPromedio}
              className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-slate-600 hover:bg-gray-50 transition-colors"
            >
              Ordenar por promedio de esta ronda
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            Sin rondas de jueces en esta edición: el ranking se ordena solo a mano.
          </p>
        )}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={ranking} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {ranking.map((id, i) => {
              const participante = porId.get(id)
              if (!participante) return null
              return (
                <FilaRanking
                  key={id}
                  participante={participante}
                  posicion={i + 1}
                  promedio={promedios.get(id) ?? null}
                  totalEncargado={totalesEncargado.get(id) ?? 0}
                />
              )
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <p className="text-xs text-slate-400 mt-4">
        Este ranking es manual y no modifica los puntos de los jueces: "Jueces" es el promedio de la
        ronda seleccionada y "Encargado" la suma de sus puntos en la edición, solo como referencia.
        Los cambios no se guardan hasta que pulses Guardar.
      </p>
    </div>
  )
}

export default RankingPage
