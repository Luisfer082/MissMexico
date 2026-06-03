import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import EdicionModal from '../../components/EdicionModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { Tables } from '../../types/database'

type Edicion = Tables<'editions'>

function EdicionesPage() {
  const [ediciones, setEdiciones] = useState<Edicion[]>([])
  // Inicia en true para mostrar spinner inmediato en la primera carga
  const [loading, setLoading] = useState(true)

  // Estado del modal de crear/editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [edicionEditando, setEdicionEditando] = useState<Edicion | undefined>(undefined)

  // Edición pendiente de confirmar borrado (null = sin confirmación abierta)
  const [edicionAEliminar, setEdicionAEliminar] = useState<Edicion | null>(null)

  // Contador para disparar recarga después de guardar/activar
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    let cancelado = false

    supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false })
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) {
          toast.error(error.message)
        } else {
          setEdiciones(data ?? [])
        }
        setLoading(false)
      })

    return () => { cancelado = true }
  }, [recargar])

  const handleActivar = async (edicion: Edicion) => {
    await toast.promise(
      (async () => {
        // Paso 1: apagar la edición activa actual (si existe). Es necesario
        // hacerlo primero porque el índice único solo permite una activa.
        const { error: errOff } = await supabase
          .from('editions')
          .update({ is_active: false })
          .eq('is_active', true)
        if (errOff) throw errOff

        // Paso 2: encender la seleccionada.
        const { error: errOn } = await supabase
          .from('editions')
          .update({ is_active: true })
          .eq('id', edicion.id)
        if (errOn) throw errOn

        setRecargar((n) => n + 1)
      })(),
      {
        loading: 'Activando edición...',
        success: `"${edicion.name}" es ahora la edición activa`,
        error: (err: unknown) => (err instanceof Error ? err.message : 'Error al activar'),
      }
    )
  }

  const handleConfirmarEliminar = async () => {
    if (!edicionAEliminar) return
    const edicion = edicionAEliminar
    setEdicionAEliminar(null)

    await toast.promise(
      (async () => {
        const { error } = await supabase
          .from('editions')
          .delete()
          .eq('id', edicion.id)

        if (error) throw error
        setEdiciones((prev) => prev.filter((e) => e.id !== edicion.id))
      })(),
      {
        loading: 'Eliminando...',
        success: 'Edición eliminada',
        error: (err: unknown) => (err instanceof Error ? err.message : 'Error al eliminar'),
      }
    )
  }

  const handleAbrirNuevo = () => {
    setEdicionEditando(undefined)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (edicion: Edicion) => {
    setEdicionEditando(edicion)
    setModalAbierto(true)
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setEdicionEditando(undefined)
  }

  const handleGuardado = () => {
    setRecargar((n) => n + 1)
  }

  return (
    <div>
      {/* Encabezado de la página */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ediciones</h1>
          <p className="text-slate-500 text-sm mt-1">{ediciones.length} registradas</p>
        </div>
        <button
          onClick={handleAbrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white
            text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva edición
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ediciones.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">No hay ediciones registradas.</p>
            <p className="text-slate-400 text-xs mt-1">Crea la primera edición y actívala para empezar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Año</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ediciones.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{e.year}</td>
                  <td className="px-4 py-3">
                    {e.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-slate-500">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!e.is_active && (
                        <button
                          onClick={() => void handleActivar(e)}
                          className="px-3 py-1 text-xs font-medium text-green-700 border border-green-200
                            hover:bg-green-50 rounded-md transition-colors"
                        >
                          Activar
                        </button>
                      )}
                      <button
                        onClick={() => handleAbrirEditar(e)}
                        className="px-3 py-1 text-xs font-medium text-slate-600 border border-gray-200
                          hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setEdicionAEliminar(e)}
                        disabled={e.is_active}
                        className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200
                          hover:bg-red-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
        <EdicionModal
          edicion={edicionEditando}
          onClose={handleCerrarModal}
          onGuardado={handleGuardado}
        />
      )}

      {/* Confirmación de borrado */}
      {edicionAEliminar && (
        <ConfirmDialog
          titulo="Eliminar edición"
          mensaje={`¿Eliminar la edición "${edicionAEliminar.name}"? Se borrarán todos sus participantes, retos, etapas y calificaciones. Esta acción es irreversible.`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => void handleConfirmarEliminar()}
          onCancelar={() => setEdicionAEliminar(null)}
        />
      )}
    </div>
  )
}

export default EdicionesPage
