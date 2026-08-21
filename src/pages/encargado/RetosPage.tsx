import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import RetoModal from '../../components/RetoModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { Tables } from '../../types/database'
import { mensajeError } from '../../utils/mensaje-error'

type Reto = Tables<'challenges'>

function RetosPage() {
  const { edicion, loading: loadingEdicion } = useEdicionActiva()
  const [retos, setRetos] = useState<Reto[]>([])
  // Inicia en true para mostrar spinner inmediato en la primera carga
  const [loadingRetos, setLoadingRetos] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Estado del modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [retoEditando, setRetoEditando] = useState<Reto | undefined>(undefined)

  // Reto pendiente de confirmar borrado (null = sin confirmación abierta)
  const [retoAEliminar, setRetoAEliminar] = useState<Reto | null>(null)

  // Contador para disparar recarga después de guardar
  const [recargar, setRecargar] = useState(0)

  const edicionId = edicion?.id

  useEffect(() => {
    if (!edicionId) return

    let cancelado = false

    supabase
      .from('challenges')
      .select('*')
      .eq('edition_id', edicionId)
      .order('order_num', { ascending: true })
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) {
          toast.error(error.message)
        } else {
          setRetos(data ?? [])
        }
        setLoadingRetos(false)
      })

    return () => { cancelado = true }
  }, [edicionId, recargar])

  const handleConfirmarEliminar = async () => {
    if (!retoAEliminar) return
    const reto = retoAEliminar
    setRetoAEliminar(null)

    await toast.promise(
      (async () => {
        const { error } = await supabase
          .from('challenges')
          .delete()
          .eq('id', reto.id)

        if (error) throw error
        setRetos((prev) => prev.filter((r) => r.id !== reto.id))
      })(),
      {
        loading: 'Eliminando...',
        success: 'Reto eliminado',
        error: (err: unknown) => mensajeError(err, 'Error al eliminar'),
      }
    )
  }

  const handleAbrirNuevo = () => {
    setRetoEditando(undefined)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (reto: Reto) => {
    setRetoEditando(reto)
    setModalAbierto(true)
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setRetoEditando(undefined)
  }

  const handleGuardado = () => {
    setRecargar((n) => n + 1)
  }

  // Filtro local por nombre (sin re-query a Supabase)
  const retosFiltrados = retos.filter((r) =>
    r.name.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loadingEdicion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!edicion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-slate-700 font-medium">No hay edición activa</p>
        <p className="text-slate-400 text-sm mt-1">Se requiere una edición activa para gestionar retos.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado de la página */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retos</h1>
          <p className="text-slate-500 text-sm mt-1">{edicion.name} — {retos.length} registrados</p>
        </div>
        <button
          onClick={handleAbrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white
            text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar reto
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900
              placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loadingRetos ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : retosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">
              {busqueda ? 'No se encontraron retos con ese nombre.' : 'No hay retos registrados.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Orden</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {retosFiltrados.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.order_num}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.description
                      ? <span className="line-clamp-1">{r.description}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAbrirEditar(r)}
                        className="px-3 py-1 text-xs font-medium text-slate-600 border border-gray-200
                          hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setRetoAEliminar(r)}
                        className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200
                          hover:bg-red-50 rounded-md transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <RetoModal
          edicionId={edicion.id}
          reto={retoEditando}
          onClose={handleCerrarModal}
          onGuardado={handleGuardado}
        />
      )}

      {/* Confirmación de borrado */}
      {retoAEliminar && (
        <ConfirmDialog
          titulo="Eliminar reto"
          mensaje={`¿Eliminar el reto "${retoAEliminar.name}"? Se borrarán también sus calificaciones. Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => void handleConfirmarEliminar()}
          onCancelar={() => setRetoAEliminar(null)}
        />
      )}
    </div>
  )
}

export default RetosPage
