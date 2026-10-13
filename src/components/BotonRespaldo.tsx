import { useRespaldo } from '../hooks/useRespaldo'

// Botón "Respaldo" del panel del encargado (Fase 10, Bloque 4). Descarga un
// JSON con toda la BD. Sustituye al backup que el plan Free de Supabase no da.
function BotonRespaldo() {
  const { generar, generando } = useRespaldo()

  return (
    <button
      type="button"
      onClick={() => void generar()}
      disabled={generando}
      title="Descarga una copia de todos los datos (confidencial)"
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
      {generando ? 'Generando…' : 'Respaldo'}
    </button>
  )
}

export default BotonRespaldo
