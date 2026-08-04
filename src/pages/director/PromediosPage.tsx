// Vista Promedios del director (Fase 6, paso 3). Read-only.
// Por ronda de jueces: promedio de calificaciones por participante (global y
// por reto) + total de puntos del encargado en la edición. El orden del
// ranking lo da el promedio de jueces (desc).

import { useMemo } from 'react'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import { usePromediosDirector } from '../../hooks/usePromediosDirector'
import { useAppStore } from '../../stores/useAppStore'
import { formatearPuntaje } from '../../utils/puntaje'

interface FilaPromedio {
  participant_id: string
  name: string
  region: string
  sash: number
  /** challenge_id -> { suma, cuenta } para promediar por reto */
  porReto: Map<string, { suma: number; cuenta: number }>
  suma: number
  cuenta: number
  promedio: number
  totalEncargado: number
  posicion: number
}

function PromediosPage() {
  const { edicion, loading: loadingEdicion, error: errorEdicion } = useEdicionActiva()
  const { rondas, puntajes, totalesEncargado, loading, error, recargar } = usePromediosDirector(
    edicion?.id,
  )

  // La selección vive en el store para compartirse con Ranking y Títulos y
  // sobrevivir al cambio de pestaña. null = sin elegir: cae a la primera.
  const rondaSeleccionada = useAppStore((s) => s.directorRondaId)
  const setRondaSeleccionada = useAppStore((s) => s.setDirectorRonda)

  const rondaEfectiva = useMemo(() => {
    if (rondas.some((r) => r.id === rondaSeleccionada)) return rondaSeleccionada ?? ''
    return rondas[0]?.id ?? ''
  }, [rondas, rondaSeleccionada])

  const rondaActual = useMemo(
    () => rondas.find((r) => r.id === rondaEfectiva) ?? null,
    [rondas, rondaEfectiva],
  )

  const puntajesDeRonda = useMemo(
    () => puntajes.filter((p) => p.round_id === rondaEfectiva),
    [puntajes, rondaEfectiva],
  )

  // Retos presentes en la ronda (columnas), ordenados por challenge_order
  const retos = useMemo(() => {
    const mapa = new Map<string, { name: string; order: number }>()
    for (const p of puntajesDeRonda) {
      if (!mapa.has(p.challenge_id)) {
        mapa.set(p.challenge_id, { name: p.challenge_name, order: p.challenge_order })
      }
    }
    return [...mapa.entries()]
      .map(([id, v]) => ({ id, name: v.name, order: v.order }))
      .sort((a, b) => a.order - b.order)
  }, [puntajesDeRonda])

  // Ranking: promedio de jueces por participante (global y por reto) + total
  // del encargado. Orden desc por promedio, desempate asc por banda.
  const filas = useMemo<FilaPromedio[]>(() => {
    const acc = new Map<string, Omit<FilaPromedio, 'promedio' | 'posicion'>>()
    for (const p of puntajesDeRonda) {
      let fila = acc.get(p.participant_id)
      if (!fila) {
        fila = {
          participant_id: p.participant_id,
          name: p.participant_name,
          region: p.participant_region,
          sash: p.sash_number,
          porReto: new Map(),
          suma: 0,
          cuenta: 0,
          totalEncargado: totalesEncargado.get(p.participant_id) ?? 0,
        }
        acc.set(p.participant_id, fila)
      }
      const reto = fila.porReto.get(p.challenge_id) ?? { suma: 0, cuenta: 0 }
      reto.suma += p.score
      reto.cuenta += 1
      fila.porReto.set(p.challenge_id, reto)
      fila.suma += p.score
      fila.cuenta += 1
    }

    return [...acc.values()]
      .map((f) => ({ ...f, promedio: f.cuenta > 0 ? f.suma / f.cuenta : 0, posicion: 0 }))
      .sort((a, b) => {
        if (b.promedio !== a.promedio) return b.promedio - a.promedio
        return a.sash - b.sash
      })
      .map((f, i) => ({ ...f, posicion: i + 1 }))
  }, [puntajesDeRonda, totalesEncargado])

  // ─── Estados de carga / error / vacío ─────────────────────────────────────

  if (loadingEdicion || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (errorEdicion || error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-red-600 font-medium">Error al cargar los promedios</p>
        <p className="text-slate-500 text-sm">{errorEdicion ?? error}</p>
        <button
          onClick={recargar}
          className="px-4 py-1.5 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!edicion) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-700 font-medium">No hay edición activa</p>
        <p className="text-slate-400 text-sm mt-1">
          El encargado debe activar una edición para ver promedios.
        </p>
      </div>
    )
  }

  if (rondas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-700 font-medium">Sin rondas de jueces</p>
        <p className="text-slate-400 text-sm mt-1">
          Aún no hay rondas de jueces configuradas en esta edición.
        </p>
      </div>
    )
  }

  // ─── Contenido ────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promedios</h1>
          <p className="text-slate-500 text-sm mt-1">{edicion.name}</p>
        </div>
        <button
          onClick={recargar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-slate-600 hover:bg-gray-50 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Selector de ronda + estado */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label htmlFor="selector-ronda" className="text-sm font-medium text-slate-700 whitespace-nowrap">
            Ronda:
          </label>
          <select
            id="selector-ronda"
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
        {rondaActual && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              rondaActual.status === 'abierta'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {rondaActual.status === 'abierta' ? 'Abierta' : 'Cerrada'}
          </span>
        )}
      </div>

      {filas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
          <p className="text-slate-700 font-medium">Sin calificaciones</p>
          <p className="text-slate-400 text-sm mt-1">
            Los jueces aún no capturan calificaciones en esta ronda.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Pos.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Participante
                </th>
                {retos.map((r) => (
                  <th
                    key={r.id}
                    className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {r.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Prom. jueces
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Pts. encargado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.map((fila) => (
                <tr key={fila.participant_id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        fila.posicion === 1
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-slate-600'
                      }`}
                    >
                      {fila.posicion}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 tabular-nums">{fila.sash}</td>
                  <td className="px-4 py-2.5 text-slate-900 font-medium">
                    {fila.name}
                    <span className="block text-xs text-slate-400 font-normal truncate max-w-[10rem]">
                      {fila.region}
                    </span>
                  </td>
                  {retos.map((r) => {
                    const v = fila.porReto.get(r.id)
                    return (
                      <td key={r.id} className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {v ? (
                          formatearPuntaje(v.suma / v.cuenta)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-brand-700">
                    {formatearPuntaje(fila.promedio)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatearPuntaje(fila.totalEncargado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3">
        Las columnas de reto muestran el promedio de todos los jueces en ese reto. "Pts. encargado"
        es la suma de los puntos capturados por el encargado en toda la edición.
      </p>
    </div>
  )
}

export default PromediosPage
