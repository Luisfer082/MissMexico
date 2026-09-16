import type { AvanceJuez, AvanceRonda as Avance } from '../utils/avance-ronda'

interface Props {
  avance: Avance | null
  loading: boolean
  error: string | null
  onRevisar: () => void
}

// Aviso de calificaciones faltantes dentro del diálogo de cierre (etapa o
// ronda). Solo informa: nunca bloquea el cierre, para que un juez que se fue
// o se quedó sin batería no deje la etapa sin poder cerrarse en pleno evento.
function AvanceRonda({ avance, loading, error, onRevisar }: Props) {
  if (loading) {
    return (
      <p className="mt-4 text-sm text-slate-500" role="status">
        Revisando calificaciones de los jueces…
      </p>
    )
  }

  if (error) {
    return (
      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p>No se pudo verificar si faltan calificaciones de los jueces.</p>
        <BotonRevisar onClick={onRevisar} />
      </div>
    )
  }

  // Sin ronda de jueces: no hay calificaciones que se puedan perder.
  if (!avance) return null

  return (
    <div className="mt-4 space-y-3">
      {avance.completa ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {avance.totalJuecesActivos === 1
            ? 'El juez envió todas sus calificaciones.'
            : `Los ${avance.totalJuecesActivos} jueces enviaron todas sus calificaciones.`}
        </p>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Faltan calificaciones de estos jueces:</p>
          <ListaJueces jueces={avance.incompletos} />
          <p className="mt-2">
            Si alguno calificó sin conexión y todavía no sincroniza, esas calificaciones se
            perderán al cerrar.
          </p>
          <BotonRevisar onClick={onRevisar} />
        </div>
      )}

      {avance.inactivos.length > 0 && (
        <div className="text-sm text-slate-500">
          <p>Jueces dados de baja asignados a la ronda:</p>
          <ListaJueces jueces={avance.inactivos} inactivos />
        </div>
      )}
    </div>
  )
}

interface ListaJuecesProps {
  jueces: AvanceJuez[]
  inactivos?: boolean
}

function ListaJueces({ jueces, inactivos = false }: ListaJuecesProps) {
  return (
    <ul className="mt-1 space-y-0.5">
      {jueces.map((j) => (
        <li key={j.id} className="flex justify-between gap-3">
          <span className="truncate">
            {j.nombre}
            {inactivos && ' (Inactivo)'}
          </span>
          <span className="shrink-0 tabular-nums">
            {j.capturadas} de {j.esperadas}
          </span>
        </li>
      ))}
    </ul>
  )
}

interface BotonRevisarProps {
  onClick: () => void
}

function BotonRevisar({ onClick }: BotonRevisarProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 min-h-[44px] rounded-lg border border-amber-400 bg-white px-3 text-sm font-medium
        text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
    >
      Volver a revisar
    </button>
  )
}

export default AvanceRonda
