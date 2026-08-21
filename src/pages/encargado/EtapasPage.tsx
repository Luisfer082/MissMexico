import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import { useConsulta } from '../../hooks/useConsulta'
import EtapaModal from '../../components/EtapaModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { Tables } from '../../types/database'
import { mensajeError } from '../../utils/mensaje-error'

type Etapa = Tables<'stages'>

function EtapasPage() {
  const { edicion, loading: loadingEdicion } = useEdicionActiva()

  // Estado del modal de crear/editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [etapaEditando, setEtapaEditando] = useState<Etapa | undefined>(undefined)

  // Etapa pendiente de confirmar borrado (null = sin confirmación abierta)
  const [etapaAEliminar, setEtapaAEliminar] = useState<Etapa | null>(null)

  const edicionId = edicion?.id

  const { datos, loading: loadingEtapas, error: errorEtapas, recargar } = useConsulta<Etapa[]>(
    edicionId
      ? () =>
          supabase
            .from('stages')
            .select('*')
            .eq('edition_id', edicionId)
            .order('order_num', { ascending: true })
      : null,
    [edicionId],
  )
  const etapas = datos ?? []

  useEffect(() => {
    if (errorEtapas) toast.error(errorEtapas)
  }, [errorEtapas])

  const handleConfirmarEliminar = async () => {
    if (!etapaAEliminar) return
    const etapa = etapaAEliminar
    setEtapaAEliminar(null)

    await toast.promise(
      (async () => {
        const { error } = await supabase
          .from('stages')
          .delete()
          .eq('id', etapa.id)

        if (error) throw error
        recargar()
      })(),
      {
        loading: 'Eliminando...',
        success: 'Etapa eliminada',
        error: (err: unknown) => mensajeError(err, 'Error al eliminar'),
      }
    )
  }

  const handleAbrirNuevo = () => {
    setEtapaEditando(undefined)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (etapa: Etapa) => {
    setEtapaEditando(etapa)
    setModalAbierto(true)
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setEtapaEditando(undefined)
  }

  const handleGuardado = () => {
    recargar()
  }

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
        <p className="text-slate-400 text-sm mt-1">Se requiere una edición activa para gestionar etapas.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado de la página */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Etapas</h1>
          <p className="text-slate-500 text-sm mt-1">{edicion.name} — {etapas.length} registradas</p>
        </div>
        <button
          onClick={handleAbrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white
            text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar etapa
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loadingEtapas ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : etapas.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">No hay etapas registradas.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Orden</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Cupo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {etapas.map((e) => {
                const cerrada = e.status === 'cerrada'
                return (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{e.order_num}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.cupo}</td>
                    <td className="px-4 py-3">
                      {cerrada ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-slate-600">
                          Cerrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Abierta
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAbrirEditar(e)}
                          disabled={cerrada}
                          className="px-3 py-1 text-xs font-medium text-slate-600 border border-gray-200
                            hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setEtapaAEliminar(e)}
                          disabled={cerrada}
                          className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200
                            hover:bg-red-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <EtapaModal
          edicionId={edicion.id}
          etapa={etapaEditando}
          onClose={handleCerrarModal}
          onGuardado={handleGuardado}
        />
      )}

      {/* Confirmación de borrado */}
      {etapaAEliminar && (
        <ConfirmDialog
          titulo="Eliminar etapa"
          mensaje={`¿Eliminar la etapa "${etapaAEliminar.name}"? Se borrarán sus participantes asociados. Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => void handleConfirmarEliminar()}
          onCancelar={() => setEtapaAEliminar(null)}
        />
      )}
    </div>
  )
}

export default EtapasPage
