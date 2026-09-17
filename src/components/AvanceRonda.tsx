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
//
// Se listan TODOS los jueces de la ronda, no solo a los que les falta: si a
// alguno se le pierde la asignación tiene que verse en pantalla.
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

  const faltan = !avance.completa

  return (
    <div
      className={`mt-4 rounded-lg border p-3 text-sm ${
        faltan
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
      }`}
    >
      <p className="font-medium">
        {faltan
          ? 'Faltan calificaciones de jueces'
          : avance.totalJuecesActivos === 1
            ? 'El juez envió todas sus calificaciones.'
            : `Los ${avance.totalJuecesActivos} jueces enviaron todas sus calificaciones.`}
      </p>

      <ul className="mt-2 space-y-0.5">
        {avance.jueces.map((j) => (
          <FilaJuez key={j.id} juez={j} />
        ))}
      </ul>

      {faltan && (
        <>
          <p className="mt-2">
            Si alguno calificó sin conexión y todavía no sincroniza, esas calificaciones se
            perderán al cerrar.
          </p>
          <BotonRevisar onClick={onRevisar} />
        </>
      )}
    </div>
  )
}

interface FilaJuezProps {
  juez: AvanceJuez
}

function FilaJuez({ juez }: FilaJuezProps) {
  const completo = juez.capturadas >= juez.esperadas
  return (
    <li className={`flex justify-between gap-3 ${juez.activo ? '' : 'opacity-60'}`}>
      <span className="truncate">
        {juez.nombre}
        {!juez.activo && <span className="ml-1 text-xs">(Inactivo)</span>}
      </span>
      <span className={`shrink-0 tabular-nums ${completo ? '' : 'font-semibold'}`}>
        {juez.capturadas} de {juez.esperadas}
      </span>
    </li>
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
