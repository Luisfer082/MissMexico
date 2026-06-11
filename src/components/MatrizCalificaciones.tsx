import { useEffect, useRef, useState } from 'react'
import ScoreCell from './ScoreCell'
import type { ParticipanteCalif, RetoCalif, ScoreEntry } from '../types/calificacion'

interface Props {
  participantes: ParticipanteCalif[]
  retos: RetoCalif[]
  getScore: (participantId: string, challengeId: string) => ScoreEntry | undefined
  onSaveScore: (scoreId: string, value: number) => Promise<void>
}

// Celda enfocada actualmente: identifica fila (participante) y columna (reto)
// para el resaltado tipo crosshair que evita capturar en la celda equivocada.
interface CeldaActiva {
  fila: string
  col: string
}

// Formatea un número a máximo 2 decimales sin ceros sobrantes
function formatearNum(n: number): string {
  return Number(n.toFixed(2)).toString()
}

// Calcula el total de una participante sumando las entradas disponibles
function calcularTotal(
  participanteId: string,
  retos: RetoCalif[],
  getScore: (participantId: string, challengeId: string) => ScoreEntry | undefined
): number {
  return retos.reduce((acc, reto) => {
    const entry = getScore(participanteId, reto.id)
    return acc + (entry ? entry.score : 0)
  }, 0)
}

// Total con flash sutil cuando el valor cambia (guardado propio o eco realtime).
// El cambio de key re-monta el span y reinicia la animación.
function TotalConFlash({ total }: { total: number }) {
  const previoRef = useRef(total)
  const [flashKey, setFlashKey] = useState(0)

  useEffect(() => {
    if (previoRef.current !== total) {
      previoRef.current = total
      setFlashKey((k) => k + 1)
    }
  }, [total])

  return (
    <span
      key={flashKey}
      className={[
        'inline-block px-1.5 py-0.5 rounded-md',
        flashKey > 0 ? 'animate-flash-brand' : '',
      ].join(' ')}
    >
      {formatearNum(total)}
    </span>
  )
}

function MatrizCalificaciones({ participantes, retos, getScore, onSaveScore }: Props) {
  const [celdaActiva, setCeldaActiva] = useState<CeldaActiva | null>(null)

  // Estado vacío: sin participantes
  if (participantes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-card py-16 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No hay participantes registradas en esta edición.</p>
      </div>
    )
  }

  // Estado vacío: sin retos
  if (retos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-card py-16 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No hay retos registrados en esta edición.</p>
      </div>
    )
  }

  return (
    // overflow-auto + max-h: habilita scroll interno vertical para que el
    // header de retos quede sticky arriba con 32 participantes en pantalla
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-auto max-h-[calc(100vh-16rem)]">
      <table
        className="text-sm border-separate border-spacing-0"
        style={{ minWidth: '100%' }}
      >
        <thead>
          <tr>
            {/* Header columna participante — sticky esquina superior izquierda */}
            <th
              className={[
                'sticky left-0 top-0 z-30 bg-gray-50',
                'min-w-[12rem] px-4 py-3 text-left',
                'text-xs font-semibold text-slate-500 uppercase tracking-wide',
                'border-b border-gray-200 border-r border-gray-100',
              ].join(' ')}
            >
              Participante
            </th>

            {/* Headers de retos — sticky arriba; el de la columna activa se resalta */}
            {retos.map((reto) => (
              <th
                key={reto.id}
                className={[
                  'sticky top-0 z-20',
                  'min-w-[5.5rem] px-3 py-3 text-center',
                  'text-xs font-semibold uppercase tracking-wide',
                  'border-b border-gray-200',
                  'transition-colors duration-150',
                  celdaActiva?.col === reto.id
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-gray-50 text-slate-500',
                ].join(' ')}
              >
                {/* line-clamp-2 para nombres largos; title para tooltip nativo */}
                <span className="line-clamp-2 block" title={reto.name}>
                  {reto.name}
                </span>
              </th>
            ))}

            {/* Header columna total — sticky esquina superior derecha */}
            <th
              className={[
                'sticky right-0 top-0 z-30 bg-brand-50',
                'min-w-[5.5rem] px-4 py-3 text-right',
                'text-xs font-semibold text-brand-700 uppercase tracking-wide',
                'border-b border-gray-200 border-l border-brand-100',
              ].join(' ')}
            >
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {participantes.map((p, idx) => {
            const total = calcularTotal(p.id, retos, getScore)
            const filaActiva = celdaActiva?.fila === p.id
            // Zebra striping: colores opacos para que las celdas sticky no
            // transparenten el contenido que pasa por debajo al hacer scroll
            const fondoFila = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'

            return (
              <tr key={p.id}>
                {/* Celda participante — sticky izquierda, resalta con la fila activa */}
                <td
                  className={[
                    'sticky left-0 z-10',
                    'px-4 py-2',
                    'border-b border-gray-100 border-r border-gray-100',
                    'min-w-[12rem]',
                    'transition-colors duration-150',
                    filaActiva ? 'bg-brand-50' : fondoFila,
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Badge con número de banda */}
                    <span
                      className={[
                        'flex-shrink-0 inline-flex items-center justify-center',
                        'w-7 h-7 rounded-full text-xs font-bold',
                        'transition-colors duration-150',
                        filaActiva
                          ? 'bg-brand-600 text-white'
                          : 'bg-brand-100 text-brand-700',
                      ].join(' ')}
                    >
                      {p.sash_number}
                    </span>

                    {/* Nombre y región truncados */}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{p.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.region}</p>
                    </div>
                  </div>
                </td>

                {/* Celdas de puntaje por reto — crosshair: fila y columna activas */}
                {retos.map((reto) => {
                  const entry = getScore(p.id, reto.id)
                  const resaltada = filaActiva || celdaActiva?.col === reto.id

                  return (
                    <td
                      key={reto.id}
                      className={[
                        'px-3 py-2 text-center border-b border-gray-100',
                        'transition-colors duration-150',
                        resaltada ? 'bg-brand-50/70' : fondoFila,
                      ].join(' ')}
                    >
                      {entry !== undefined ? (
                        <ScoreCell
                          scoreId={entry.id}
                          value={entry.score}
                          onSave={onSaveScore}
                          onFocusChange={(enfocado) =>
                            setCeldaActiva(enfocado ? { fila: p.id, col: reto.id } : null)
                          }
                        />
                      ) : (
                        // Sin entrada: todavía no se ha creado el registro
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )
                })}

                {/* Celda total — sticky derecha, columna destacada con tinte de marca */}
                <td
                  className={[
                    'sticky right-0 z-10 bg-brand-50',
                    'px-4 py-2 text-right',
                    'text-base font-bold tabular-nums text-brand-900',
                    'border-b border-brand-100 border-l border-brand-100',
                  ].join(' ')}
                >
                  <TotalConFlash total={total} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default MatrizCalificaciones
