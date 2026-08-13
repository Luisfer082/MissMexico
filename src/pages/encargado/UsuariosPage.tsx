import { useState } from 'react'
import toast from 'react-hot-toast'
import { useUsuarios, type Usuario } from '../../hooks/useUsuarios'
import { useAppStore } from '../../stores/useAppStore'
import { etiquetaRol, rolesUsuario } from '../../schemas/usuario'
import { mensajeError } from '../../utils/mensaje-error'
import UsuarioModal from '../../components/UsuarioModal'
import ConfirmDialog from '../../components/ConfirmDialog'

// Colores por rol para distinguirlos de un vistazo en la lista.
const colorRol: Record<(typeof rolesUsuario)[number], string> = {
  encargado: 'bg-brand-100 text-brand-700',
  juez: 'bg-blue-100 text-blue-700',
  director: 'bg-purple-100 text-purple-700',
  anunciador: 'bg-amber-100 text-amber-700',
}

function UsuariosPage() {
  const { usuarios, conHistorial, loading, error, crear, actualizar, cambiarEstado, eliminar } =
    useUsuarios()

  // Para no ofrecerle al encargado acciones sobre su propia cuenta.
  const miId = useAppStore((s) => s.profile?.id)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | undefined>(undefined)
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null)
  const [usuarioADesactivar, setUsuarioADesactivar] = useState<Usuario | null>(null)

  const handleAbrirNuevo = () => {
    setUsuarioEditando(undefined)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (usuario: Usuario) => {
    setUsuarioEditando(usuario)
    setModalAbierto(true)
  }

  const handleConfirmarDesactivar = async () => {
    if (!usuarioADesactivar) return
    const usuario = usuarioADesactivar
    setUsuarioADesactivar(null)

    await toast.promise(cambiarEstado(usuario.id, false), {
      loading: 'Desactivando...',
      success: `${usuario.full_name ?? 'Usuario'} ya no puede entrar`,
      error: (err: unknown) => mensajeError(err, 'Error al desactivar'),
    })
  }

  const handleReactivar = async (usuario: Usuario) => {
    await toast.promise(cambiarEstado(usuario.id, true), {
      loading: 'Reactivando...',
      success: `${usuario.full_name ?? 'Usuario'} puede entrar de nuevo`,
      error: (err: unknown) => mensajeError(err, 'Error al reactivar'),
    })
  }

  const handleConfirmarEliminar = async () => {
    if (!usuarioAEliminar) return
    const usuario = usuarioAEliminar
    setUsuarioAEliminar(null)

    await toast.promise(eliminar(usuario.id), {
      loading: 'Eliminando...',
      success: 'Usuario eliminado',
      error: (err: unknown) => mensajeError(err, 'Error al eliminar'),
    })
  }

  const activos = usuarios.filter((u) => u.active).length

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">
            {usuarios.length} registrados · {activos} activos
          </p>
        </div>
        <button
          onClick={handleAbrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white
            text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">No hay usuarios registrados.</p>
            <p className="text-slate-400 text-xs mt-1">Crea el primer juez para empezar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Correo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => {
                const soyYo = u.id === miId
                // Eliminar solo si nunca calificó ni fue asignado a una ronda:
                // el FK es on delete cascade y se llevaría sus datos.
                const puedeEliminarse = !soyYo && !conHistorial.has(u.id)

                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.active ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.full_name ?? <span className="text-slate-400 italic">Sin nombre</span>}
                      {soyYo && <span className="ml-2 text-xs text-slate-400">(tú)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      {u.role ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorRol[u.role]}`}>
                          {etiquetaRol[u.role]}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin rol</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-slate-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAbrirEditar(u)}
                          className="px-3 py-1 text-xs font-medium text-slate-600 border border-gray-200
                            hover:bg-gray-100 rounded-md transition-colors"
                        >
                          Editar
                        </button>
                        {u.active ? (
                          <button
                            onClick={() => setUsuarioADesactivar(u)}
                            disabled={soyYo}
                            title={soyYo ? 'No puedes desactivar tu propia cuenta' : undefined}
                            className="px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200
                              hover:bg-amber-50 rounded-md transition-colors
                              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleReactivar(u)}
                            className="px-3 py-1 text-xs font-medium text-green-700 border border-green-200
                              hover:bg-green-50 rounded-md transition-colors"
                          >
                            Reactivar
                          </button>
                        )}
                        {puedeEliminarse && (
                          <button
                            onClick={() => setUsuarioAEliminar(u)}
                            className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200
                              hover:bg-red-50 rounded-md transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400 leading-relaxed">
        Desactivar es reversible y conserva las calificaciones del usuario. El botón "Eliminar" solo
        aparece en usuarios que nunca calificaron ni fueron asignados a una ronda.
      </p>

      {modalAbierto && (
        <UsuarioModal
          usuario={usuarioEditando}
          onCrear={crear}
          onActualizar={actualizar}
          onClose={() => {
            setModalAbierto(false)
            setUsuarioEditando(undefined)
          }}
        />
      )}

      {usuarioADesactivar && (
        <ConfirmDialog
          titulo="Desactivar usuario"
          mensaje={`${usuarioADesactivar.full_name ?? 'Este usuario'} dejará de poder entrar a la app. Sus calificaciones se conservan y puedes reactivarlo cuando quieras.`}
          textoConfirmar="Desactivar"
          onConfirmar={() => void handleConfirmarDesactivar()}
          onCancelar={() => setUsuarioADesactivar(null)}
        />
      )}

      {usuarioAEliminar && (
        <ConfirmDialog
          titulo="Eliminar usuario"
          mensaje={`¿Eliminar a ${usuarioAEliminar.full_name ?? 'este usuario'} (${usuarioAEliminar.email ?? 'sin correo'})? Se borra su cuenta de acceso de forma permanente.`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => void handleConfirmarEliminar()}
          onCancelar={() => setUsuarioAEliminar(null)}
        />
      )}
    </div>
  )
}

export default UsuariosPage
