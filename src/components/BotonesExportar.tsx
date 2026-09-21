import { useExportarCalificaciones } from '../hooks/useExportarCalificaciones'
import type { FormatoExportacion } from '../hooks/useExportarCalificaciones'
import type { Tables } from '../types/database'

interface Props {
  edicion: Tables<'editions'>
}

const ETIQUETAS: Record<FormatoExportacion, string> = { excel: 'Excel', pdf: 'PDF' }

// Botones de exportación del detalle de calificaciones (Fase 8). Se usan en
// Calificaciones (encargado) y Promedios (director).
function BotonesExportar({ edicion }: Props) {
  const { exportar, exportando } = useExportarCalificaciones(edicion)

  return (
    <div className="flex items-center gap-2" title="Exportar detalle de calificaciones">
      <span className="text-sm text-slate-500 hidden sm:inline">Exportar:</span>
      {(['excel', 'pdf'] as const).map((formato) => (
        <button
          key={formato}
          type="button"
          onClick={() => void exportar(formato)}
          disabled={exportando !== null}
          className="flex items-center gap-1.5 px-3 min-h-[44px] md:min-h-0 md:py-1.5 rounded-md
            border border-gray-200 bg-white text-sm font-medium text-slate-600 hover:bg-gray-50
            transition-colors disabled:opacity-50"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
          </svg>
          {exportando === formato ? 'Generando…' : ETIQUETAS[formato]}
        </button>
      ))}
    </div>
  )
}

export default BotonesExportar
