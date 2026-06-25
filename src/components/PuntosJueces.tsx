// Componente que muestra los puntos capturados por los jueces.
// Solo visible para el Encargado dentro de CalificacionesPage.
// Aislamiento de jueces (regla 5) no se rompe: los jueces nunca acceden
// a esta página; la RLS "judge_scores_select_admin" lo refuerza en BD.

import { useMemo, useState } from 'react'
import { usePuntosJueces } from '../hooks/usePuntosJueces'
import type { FilaPuntoJuez, RondaPuntosJueces } from '../hooks/usePuntosJueces'

interface Props {
  edicionId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatearPuntaje(n: number): string {
  // Muestra hasta 2 decimales sin ceros sobrantes
  return Number(n.toFixed(2)).toString()
}

// Ordena las filas: primero por juez (alfabético), luego por número de banda,
// luego por orden de reto. Determinístico para evitar saltos visuales.
function ordenarFilas(filas: FilaPuntoJuez[]): FilaPuntoJuez[] {
  return [...filas].sort((a, b) => {
    const juezCmp = a.judge_name.localeCompare(b.judge_name, 'es')
    if (juezCmp !== 0) return juezCmp
    if (a.sash_number !== b.sash_number) return a.sash_number - b.sash_number
    return a.challenge_order - b.challenge_order
  })
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function BadgeEstado({ status }: { status: RondaPuntosJueces['status'] }) {
  const esAbierta = status === 'abierta'
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        esAbierta ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
      ].join(' ')}
    >
      {esAbierta && (
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </span>
      )}
      {esAbierta ? 'Abierta' : 'Cerrada'}
    </span>
  )
}

interface ResumenProps {
  filas: FilaPuntoJuez[]
}

function ResumenRonda({ filas }: ResumenProps) {
  const numJueces = new Set(filas.map((f) => f.judge_id)).size
  const numParticipantes = new Set(filas.map((f) => f.participant_id)).size
  const numRetos = new Set(filas.map((f) => f.challenge_id)).size

  if (filas.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {[
        { label: 'Jueces', valor: numJueces },
        { label: 'Participantes', valor: numParticipantes },
        { label: 'Retos', valor: numRetos },
        { label: 'Puntuaciones', valor: filas.length },
      ].map(({ label, valor }) => (
        <div
          key={label}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200"
        >
          <span className="text-base font-semibold text-slate-900 tabular-nums">{valor}</span>
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function PuntosJueces({ edicionId }: Props) {
  const { rondas, puntajes, loading, error, recargar } = usePuntosJueces(edicionId)

  // '' significa "ninguna selección explícita aún": rondaEfectiva cae al primer item.
  const [rondaSeleccionada, setRondaSeleccionada] = useState<string>('')
  // 'todos' o un judge_id concreto. Si el ID ya no existe en la ronda activa,
  // juezFiltroEfectivo cae a 'todos' automáticamente sin necesidad de un effect.
  const [juezFiltro, setJuezFiltro] = useState<string>('todos')

  // Ronda efectiva: la seleccionada si existe en la lista actual, si no la primera.
  // Evita un useEffect de sincronización (setState-in-effect).
  const rondaEfectiva = useMemo(() => {
    if (rondas.some((r) => r.id === rondaSeleccionada)) return rondaSeleccionada
    return rondas[0]?.id ?? ''
  }, [rondas, rondaSeleccionada])

  // Datos de la ronda efectiva
  const rondaActual = useMemo(
    () => rondas.find((r) => r.id === rondaEfectiva) ?? null,
    [rondas, rondaEfectiva],
  )

  // Puntajes de la ronda efectiva
  const puntajesDeRonda = useMemo(
    () => puntajes.filter((p) => p.round_id === rondaEfectiva),
    [puntajes, rondaEfectiva],
  )

  // Jueces únicos en la ronda efectiva
  const juecesDeRonda = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of puntajesDeRonda) {
      if (!mapa.has(p.judge_id)) mapa.set(p.judge_id, p.judge_name)
    }
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [puntajesDeRonda])

  // Si el juez almacenado no pertenece a la ronda efectiva, cae a 'todos'.
  // Esto reemplaza el useEffect de reset sin introducir setState-in-effect.
  const juezFiltroEfectivo = useMemo(
    () =>
      juezFiltro === 'todos' || juecesDeRonda.some((j) => j.id === juezFiltro)
        ? juezFiltro
        : 'todos',
    [juezFiltro, juecesDeRonda],
  )

  // Puntajes con filtro de juez aplicado y ordenados
  const puntajesFiltrados = useMemo(() => {
    const base =
      juezFiltroEfectivo === 'todos'
        ? puntajesDeRonda
        : puntajesDeRonda.filter((p) => p.judge_id === juezFiltroEfectivo)
    return ordenarFilas(base)
  }, [puntajesDeRonda, juezFiltroEfectivo])

  // ─── Render: estados de carga y error ────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-red-600 font-medium">Error al cargar los puntos de jueces</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <button
          onClick={recargar}
          className="px-4 py-1.5 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (rondas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-slate-700 font-medium">Sin rondas de jueces</p>
        <p className="text-slate-400 text-sm mt-1">
          Aún no hay rondas de jueces configuradas para esta edición.
        </p>
      </div>
    )
  }

  // ─── Render: contenido ────────────────────────────────────────────────────

  return (
    <div>
      {/* Controles: selector de ronda + badge de estado + botón actualizar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label
            htmlFor="selector-ronda"
            className="text-sm font-medium text-slate-700 whitespace-nowrap"
          >
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

        {rondaActual && <BadgeEstado status={rondaActual.status} />}

        {rondaActual?.closed_at && (
          <span className="text-xs text-slate-400">
            Cerrada el {formatearFecha(rondaActual.closed_at)}
          </span>
        )}

        {/* Espaciador */}
        <div className="flex-1" />

        <button
          onClick={recargar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-slate-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Actualizar
        </button>
      </div>

      {/* Resumen de la ronda */}
      <ResumenRonda filas={puntajesDeRonda} />

      {/* Filtro de juez — solo visible si hay más de un juez en la ronda */}
      {juecesDeRonda.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <label
            htmlFor="selector-juez"
            className="text-sm font-medium text-slate-700 whitespace-nowrap"
          >
            Filtrar por juez:
          </label>
          <select
            id="selector-juez"
            value={juezFiltroEfectivo}
            onChange={(e) => setJuezFiltro(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="todos">Todos los jueces</option>
            {juecesDeRonda.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Estado vacío dentro de una ronda existente */}
      {puntajesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-gray-200 shadow-card">
          <p className="text-slate-700 font-medium">Sin puntuaciones</p>
          <p className="text-slate-400 text-sm mt-1">
            {juezFiltroEfectivo !== 'todos'
              ? 'Este juez aún no ha capturado puntuaciones en esta ronda.'
              : 'Aún no hay puntuaciones capturadas en esta ronda.'}
          </p>
        </div>
      ) : (
        /* Tabla de puntuaciones */
        <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Juez
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Participante
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Región
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Reto
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Puntaje
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Actualizado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {puntajesFiltrados.map((fila, idx) => {
                // Mostrar nombre del juez solo en la primera fila de cada bloque
                const esNuevoJuez =
                  idx === 0 || puntajesFiltrados[idx - 1].judge_id !== fila.judge_id

                return (
                  <tr key={fila.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      {esNuevoJuez ? (
                        <span className="font-medium text-slate-800">{fila.judge_name}</span>
                      ) : (
                        <span className="text-slate-300 select-none">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 tabular-nums">
                      {fila.sash_number}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 font-medium">
                      {fila.participant_name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-[10rem]">
                      {fila.participant_region}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{fila.challenge_name}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                      {formatearPuntaje(fila.score)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400 whitespace-nowrap">
                      {formatearFecha(fila.updated_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PuntosJueces
