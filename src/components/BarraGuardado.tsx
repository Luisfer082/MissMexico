import toast from 'react-hot-toast'
import { useAppStore } from '../stores/useAppStore'

// Barra fija de "cambios sin guardar" del módulo Director. Vive en el layout
// (no en cada página) para que el botón Guardar siga visible al alternar entre
// Ranking y Títulos: el borrador es uno solo y se guarda de una tanda.
function BarraGuardado() {
  const hayCambios = useAppStore((s) => s.hayCambiosSinGuardar)
  const guardando = useAppStore((s) => s.directorGuardando)
  const guardar = useAppStore((s) => s.guardarDirector)
  const descartar = useAppStore((s) => s.descartarCambios)

  if (!hayCambios) return null

  const handleGuardar = () => {
    void toast.promise(guardar(), {
      loading: 'Guardando cambios...',
      success: 'Cambios guardados',
      error: (err: unknown) => (err instanceof Error ? err.message : 'Error al guardar'),
    })
  }

  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 px-4 py-3 bg-amber-50 border-t border-amber-200">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <p className="text-sm text-amber-900 font-medium">
          Tienes cambios sin guardar.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={descartar}
            disabled={guardando}
            className="px-3 min-h-[40px] rounded-lg border border-amber-300 text-amber-900 text-sm
              font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="px-4 min-h-[40px] rounded-lg bg-brand-600 text-white text-sm font-medium
              hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2
              focus:ring-brand-500 focus:ring-offset-2 disabled:bg-gray-300"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BarraGuardado
