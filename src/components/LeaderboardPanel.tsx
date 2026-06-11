import type { LeaderboardRow } from '../types/calificacion'

interface Props {
  rows: LeaderboardRow[]
}

// Formatea un número a máximo 2 decimales sin ceros sobrantes
function formatearNum(n: number): string {
  return Number(n.toFixed(2)).toString()
}

// Devuelve las clases del badge de posición según el ranking
function clasesBadge(posicion: number): string {
  if (posicion === 1) return 'bg-brand-600 text-white'
  if (posicion === 2) return 'bg-brand-400 text-white'
  if (posicion === 3) return 'bg-brand-200 text-brand-800'
  return 'bg-gray-100 text-slate-500'
}

function LeaderboardPanel({ rows }: Props) {
  // Estado vacío: sin puntajes todavía
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-16 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Aún no hay puntajes registrados.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {/* Columna posición */}
            <th className="w-16 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Pos.
            </th>
            {/* Columna participante */}
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Participante
            </th>
            {/* Columna total */}
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total
            </th>
            {/* Columna promedio */}
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Promedio
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr
              key={row.participant.id}
              className="hover:bg-gray-50/60 transition-colors"
            >
              {/* Badge de posición */}
              <td className="px-4 py-3">
                <span
                  className={[
                    'inline-flex items-center justify-center w-7 h-7 rounded-full',
                    'text-xs font-bold transition-colors',
                    clasesBadge(row.posicion),
                  ].join(' ')}
                >
                  {row.posicion}
                </span>
              </td>

              {/* Nombre y región */}
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{row.participant.full_name}</p>
                <p className="text-xs text-slate-400">{row.participant.region}</p>
              </td>

              {/* Total */}
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                {formatearNum(row.total)}
              </td>

              {/* Promedio */}
              <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                {formatearNum(row.promedio)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default LeaderboardPanel
