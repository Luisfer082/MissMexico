import type { LeaderboardRow } from '../types/calificacion'

interface Props {
  rows: LeaderboardRow[]
}

// Formatea un número a máximo 2 decimales sin ceros sobrantes
function formatearNum(n: number): string {
  return Number(n.toFixed(2)).toString()
}

// Devuelve las clases del badge de posición: oro/plata/bronce para el top 3,
// neutro para el resto. Distinguible de un vistazo en proyección.
function clasesBadge(posicion: number): string {
  if (posicion === 1) return 'bg-gold-400 text-gold-900 ring-2 ring-gold-200'
  if (posicion === 2) return 'bg-slate-300 text-slate-700 ring-2 ring-slate-200'
  if (posicion === 3) return 'bg-orange-300 text-orange-900 ring-2 ring-orange-200'
  return 'bg-gray-100 text-slate-500'
}

function LeaderboardPanel({ rows }: Props) {
  // Estado vacío: sin puntajes todavía
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-card py-16 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Aún no hay puntajes registrados.</p>
      </div>
    )
  }

  // Total del líder: referencia para las barras de progreso relativas
  const totalLider = Math.max(...rows.map((r) => r.total), 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-x-auto">
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
            {/* Desglose: puntos del encargado y de jueces (escalas distintas) */}
            <th className="w-24 px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Encargado
            </th>
            <th className="w-24 px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Jueces
            </th>
            {/* Columna total combinado (incluye barra relativa al líder) */}
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total
            </th>
            {/* Columna promedio */}
            <th className="w-28 px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Promedio
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => {
            // Ancho de la barra relativo al total del líder (0-100%)
            const porcentaje = totalLider > 0 ? (row.total / totalLider) * 100 : 0
            const esTop3 = row.posicion <= 3

            return (
              <tr
                key={row.participant.id}
                className="hover:bg-gray-50/60 transition-colors"
              >
                {/* Badge de posición */}
                <td className="px-4 py-3">
                  <span
                    className={[
                      'inline-flex items-center justify-center w-8 h-8 rounded-full',
                      'text-xs font-bold transition-colors',
                      clasesBadge(row.posicion),
                    ].join(' ')}
                  >
                    {row.posicion}
                  </span>
                </td>

                {/* Nombre y región */}
                <td className="px-4 py-3">
                  <p className={['truncate', esTop3 ? 'font-semibold text-slate-900' : 'font-medium text-slate-900'].join(' ')}>
                    {row.participant.full_name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{row.participant.region}</p>
                </td>

                {/* Puntos del encargado (challenge_scores) */}
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                  {formatearNum(row.totalEncargado)}
                </td>

                {/* Puntos de jueces (judge_scores) */}
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                  {row.totalJueces > 0 ? formatearNum(row.totalJueces) : '—'}
                </td>

                {/* Total combinado con barra de progreso relativa al líder */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <div className="w-28 sm:w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={[
                          'h-full rounded-full transition-all duration-500',
                          row.posicion === 1 ? 'bg-gold-400' : 'bg-brand-400',
                        ].join(' ')}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <span className="font-semibold tabular-nums text-slate-900 min-w-[3rem] text-right">
                      {formatearNum(row.total)}
                    </span>
                  </div>
                </td>

                {/* Promedio */}
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                  {formatearNum(row.promedio)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default LeaderboardPanel
