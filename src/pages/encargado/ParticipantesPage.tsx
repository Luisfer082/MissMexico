import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import ParticipanteModal from '../../components/ParticipanteModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { Tables } from '../../types/database'

type Participante = Tables<'participants'>

// Avatar pequeño: foto si existe, inicial si no
function Avatar({ nombre, photoUrl }: { nombre: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={nombre}
        className="w-8 h-8 rounded-full object-cover bg-gray-100"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
      <span className="text-rose-700 text-xs font-semibold">{nombre.charAt(0).toUpperCase()}</span>
    </div>
  )
}

function ParticipantesPage() {
  const { edicion, loading: loadingEdicion } = useEdicionActiva()
  const [participantes, setParticipantes] = useState<Participante[]>([])
  // Inicia en true para mostrar spinner inmediato en la primera carga
  const [loadingParticipantes, setLoadingParticipantes] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Estado del modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [participanteEditando, setParticipanteEditando] = useState<Participante | undefined>(undefined)

  // Participante pendiente de confirmar borrado (null = sin confirmación abierta)
  const [participanteAEliminar, setParticipanteAEliminar] = useState<Participante | null>(null)

  // Contador para disparar recarga después de guardar
  const [recargar, setRecargar] = useState(0)

  const edicionId = edicion?.id

  useEffect(() => {
    if (!edicionId) return

    let cancelado = false

    // La carga se indica iniciando el spinner antes del efecto, ver estado inicial
    supabase
      .from('participants')
      .select('*')
      .eq('edition_id', edicionId)
      .order('sash_number', { ascending: true })
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) {
          toast.error(error.message)
        } else {
          setParticipantes(data ?? [])
        }
        setLoadingParticipantes(false)
      })

    return () => { cancelado = true }
  }, [edicionId, recargar])

  const handleConfirmarEliminar = async () => {
    if (!participanteAEliminar) return
    const participante = participanteAEliminar
    setParticipanteAEliminar(null)

    await toast.promise(
      (async () => {
        const { error } = await supabase
          .from('participants')
          .delete()
          .eq('id', participante.id)

        if (error) throw error
        setParticipantes((prev) => prev.filter((p) => p.id !== participante.id))
      })(),
      {
        loading: 'Eliminando...',
        success: 'Participante eliminada',
        error: (err: unknown) => (err instanceof Error ? err.message : 'Error al eliminar'),
      }
    )
  }

  const handleAbrirNuevo = () => {
    setParticipanteEditando(undefined)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (participante: Participante) => {
    setParticipanteEditando(participante)
    setModalAbierto(true)
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setParticipanteEditando(undefined)
  }

  const handleGuardado = () => {
    // Disparar recarga de la lista
    setRecargar((n) => n + 1)
  }

  // Filtro local por nombre (sin re-query a Supabase)
  const participantesFiltrados = participantes.filter((p) =>
    p.full_name.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loadingEdicion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!edicion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-slate-700 font-medium">No hay edición activa</p>
        <p className="text-slate-400 text-sm mt-1">Se requiere una edición activa para gestionar participantes.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado de la página */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Participantes</h1>
          <p className="text-slate-500 text-sm mt-1">{edicion.name} — {participantes.length} registradas</p>
        </div>
        <button
          onClick={handleAbrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white
            text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar participante
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
              placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loadingParticipantes ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : participantesFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">
              {busqueda ? 'No se encontraron participantes con ese nombre.' : 'No hay participantes registradas.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Foto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Región</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {participantesFiltrados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.sash_number}</td>
                  <td className="px-4 py-3">
                    <Avatar nombre={p.full_name} photoUrl={p.photo_url} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.region}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAbrirEditar(p)}
                        className="px-3 py-1 text-xs font-medium text-slate-600 border border-gray-200
                          hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setParticipanteAEliminar(p)}
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
        <ParticipanteModal
          edicionId={edicion.id}
          participante={participanteEditando}
          onClose={handleCerrarModal}
          onGuardado={handleGuardado}
        />
      )}

      {/* Confirmación de borrado */}
      {participanteAEliminar && (
        <ConfirmDialog
          titulo="Eliminar participante"
          mensaje={`¿Eliminar a ${participanteAEliminar.full_name}? Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => void handleConfirmarEliminar()}
          onCancelar={() => setParticipanteAEliminar(null)}
        />
      )}
    </div>
  )
}

export default ParticipantesPage
