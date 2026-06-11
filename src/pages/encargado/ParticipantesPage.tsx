import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import ParticipanteModal from '../../components/ParticipanteModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { Tables } from '../../types/database'

type Participante = Tables<'participants'>

// Avatar con fallback robusto: si la imagen falla o no existe, muestra la inicial
// con gradiente brand. Nunca deja el espacio vacío con display:none.
function AvatarParticipante({ nombre, photoUrl }: { nombre: string; photoUrl: string | null }) {
  const [imgError, setImgError] = useState(false)
  const inicial = nombre.charAt(0).toUpperCase()

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={`Foto de ${nombre}`}
        className="w-12 h-12 rounded-lg object-cover bg-brand-100 flex-shrink-0"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 select-none">
      <span className="text-white text-base font-bold">{inicial}</span>
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
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!edicion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div>
          <p className="text-slate-700 font-semibold">Sin edición activa</p>
          <p className="text-slate-400 text-sm mt-1">Se requiere una edición activa para gestionar participantes.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado de la página */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Participantes</h1>
          <p className="text-slate-500 text-sm mt-1">
            {edicion.name}
            {participantes.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                {participantes.length} registradas
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleAbrirNuevo}
          className="inline-flex items-center gap-2 px-4 h-11 bg-brand-600 hover:bg-brand-700 active:bg-brand-800
            text-white text-sm font-semibold rounded-lg transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 shadow-sm"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar participante
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm text-slate-900
              placeholder-slate-400 bg-white shadow-card
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Tabla de participantes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        {loadingParticipantes ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : participantesFiltrados.length === 0 ? (
          /* Estado vacío */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            {busqueda ? (
              <>
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-700">Sin resultados</p>
                <p className="text-slate-500 text-sm mt-1">
                  {`No hay participantes que coincidan con "${busqueda}".`}
                </p>
                <button
                  onClick={() => setBusqueda('')}
                  className="mt-4 inline-flex items-center h-11 px-4 text-sm font-medium text-brand-600
                    hover:text-brand-700 border border-brand-200 hover:border-brand-300 hover:bg-brand-50
                    rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-700">Sin participantes</p>
                <p className="text-slate-500 text-sm mt-1">
                  Agrega la primera participante para comenzar.
                </p>
                <button
                  onClick={handleAbrirNuevo}
                  className="mt-4 inline-flex items-center gap-1.5 h-11 px-4 bg-brand-600 hover:bg-brand-700
                    text-white text-sm font-semibold rounded-lg transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar participante
                </button>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {/* Columna de banda: ancho fijo, alineada a la izquierda */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">
                  Banda
                </th>
                {/* Columna de participante: foto + nombre + región unificados */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Participante
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {participantesFiltrados.map((p) => (
                <tr key={p.id} className="hover:bg-brand-50 transition-colors duration-150 group">
                  {/* Número de banda como badge brand */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2.5 py-1
                      rounded-md bg-brand-100 text-brand-700 text-xs font-bold tabular-nums">
                      {p.sash_number}
                    </span>
                  </td>

                  {/* Foto + nombre + región en una sola celda (perfil compacto) */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarParticipante nombre={p.full_name} photoUrl={p.photo_url} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 leading-snug truncate">{p.full_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{p.region}</p>
                      </div>
                    </div>
                  </td>

                  {/* Botones de acción: h-11 para touch target de 44 px */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAbrirEditar(p)}
                        title={`Editar a ${p.full_name}`}
                        className="h-11 px-3 inline-flex items-center gap-1.5 text-xs font-medium
                          text-slate-600 border border-gray-200 rounded-lg
                          hover:bg-gray-100 hover:border-gray-300
                          transition-colors duration-150
                          focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => setParticipanteAEliminar(p)}
                        title={`Eliminar a ${p.full_name}`}
                        className="h-11 px-3 inline-flex items-center gap-1.5 text-xs font-medium
                          text-red-600 border border-red-100 rounded-lg
                          hover:bg-red-50 hover:border-red-200
                          transition-colors duration-150
                          focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
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
