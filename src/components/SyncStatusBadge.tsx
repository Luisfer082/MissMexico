import type { EstadoSync } from '../hooks/useCalificacionJuez'

interface Props {
  estado: EstadoSync
  pendientes: number
}

// Indicador de sincronización del módulo juez. El color NUNCA es el único
// indicador (a11y): siempre acompaña icono + texto.
function SyncStatusBadge({ estado, pendientes }: Props) {
  if (estado === 'offline') {
    return (
      <span className="inline-flex items-center gap-2 px-3 min-h-[36px] rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636L5.636 18.364M12 20h.01M8.111 16.404a5 5 0 017.778 0M3 8.5a12 12 0 0118 0" />
        </svg>
        Sin conexión{pendientes > 0 ? ` · ${pendientes} sin guardar` : ''}
      </span>
    )
  }

  if (estado === 'sincronizando') {
    return (
      <span className="inline-flex items-center gap-2 px-3 min-h-[36px] rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
        <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Sincronizando{pendientes > 0 ? ` · ${pendientes}` : '…'}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 px-3 min-h-[36px] rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Al día
    </span>
  )
}

export default SyncStatusBadge
