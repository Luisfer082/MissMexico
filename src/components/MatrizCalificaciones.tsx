import ScoreCell from './ScoreCell'
import type { ParticipanteCalif, RetoCalif, ScoreEntry } from '../types/calificacion'

interface Props {
  participantes: ParticipanteCalif[]
  retos: RetoCalif[]
  getScore: (participantId: string, challengeId: string) => ScoreEntry | undefined
  onSaveScore: (scoreId: string, value: number) => Promise<void>
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

function MatrizCalificaciones({ participantes, retos, getScore, onSaveScore }: Props) {
  // Estado vacío: sin participantes
  if (participantes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-16 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No hay participantes registrados en esta edición.</p>
      </div>
    )
  }

  // Estado vacío: sin retos
  if (retos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-16 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No hay retos registrados en esta edición.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table
        className="text-sm border-separate border-spacing-0"
        style={{ minWidth: '100%' }}
      >
        <thead>
          <tr>
            {/* Header columna participante — sticky izquierda */}
            <th
              className={[
                'sticky left-0 z-20 bg-gray-50',
                'min-w-[12rem] px-4 py-3 text-left',
                'text-xs font-semibold text-slate-500 uppercase tracking-wide',
                'border-b border-gray-100 border-r border-gray-100',
              ].join(' ')}
            >
              Participante
            </th>

            {/* Headers de retos */}
            {retos.map((reto) => (
              <th
                key={reto.id}
                className={[
                  'min-w-[5rem] px-3 py-3 text-center bg-gray-50',
                  'text-xs font-semibold text-slate-500 uppercase tracking-wide',
                  'border-b border-gray-100',
                ].join(' ')}
              >
                {/* line-clamp-2 para nombres largos; title para tooltip nativo */}
                <span className="line-clamp-2 block" title={reto.name}>
                  {reto.name}
                </span>
              </th>
            ))}

            {/* Header columna total — sticky derecha */}
            <th
              className={[
                'sticky right-0 z-20 bg-gray-50',
                'min-w-[5rem] px-4 py-3 text-right',
                'text-xs font-semibold text-slate-500 uppercase tracking-wide',
                'border-b border-gray-100 border-l border-gray-100',
              ].join(' ')}
            >
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {participantes.map((p) => {
            const total = calcularTotal(p.id, retos, getScore)

            return (
              <tr
                key={p.id}
                className="hover:bg-gray-50/60 transition-colors border-b border-gray-50"
              >
                {/* Celda participante — sticky izquierda */}
                <td
                  className={[
                    'sticky left-0 z-10 bg-white',
                    'px-4 py-2.5',
                    'border-b border-gray-50 border-r border-gray-100',
                    'min-w-[12rem]',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Badge con número de banda */}
                    <span
                      className={[
                        'flex-shrink-0 inline-flex items-center justify-center',
                        'w-6 h-6 rounded-full',
                        'bg-brand-100 text-brand-700 text-xs font-semibold',
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

                {/* Celdas de puntaje por reto */}
                {retos.map((reto) => {
                  const entry = getScore(p.id, reto.id)

                  return (
                    <td
                      key={reto.id}
                      className="px-3 py-2.5 text-center border-b border-gray-50"
                    >
                      {entry !== undefined ? (
                        <ScoreCell
                          scoreId={entry.id}
                          value={entry.score}
                          onSave={onSaveScore}
                        />
                      ) : (
                        // Sin entrada: todavía no se ha creado el registro
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )
                })}

                {/* Celda total — sticky derecha */}
                <td
                  className={[
                    'sticky right-0 z-10 bg-white',
                    'px-4 py-2.5 text-right',
                    'font-semibold tabular-nums text-slate-900',
                    'border-b border-gray-50 border-l border-gray-100',
                  ].join(' ')}
                >
                  {formatearNum(total)}
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
