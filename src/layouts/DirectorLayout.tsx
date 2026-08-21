import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '../stores/useAppStore'
import { useEdicionActiva } from '../hooks/useEdicionActiva'
import BarraGuardado from '../components/BarraGuardado'
import ConfirmDialog from '../components/ConfirmDialog'
import { mensajeError } from '../utils/mensaje-error'

// Layout del módulo Director. Header oscuro estilo juez (opera en tablet o
// laptop a pantalla completa, sin sidebar) + tabs para sus tres vistas:
// Promedios (read-only), Ranking (manual, drag) y Títulos (drag + envío).
//
// El layout es también quien carga el borrador del director (una sola vez para
// las tres pestañas) y quien monta la barra de "cambios sin guardar" y la
// guardia de navegación.
function DirectorLayout() {
  const navigate = useNavigate()
  const profile = useAppStore((s) => s.profile)
  const signOut = useAppStore((s) => s.signOut)
  const { edicion } = useEdicionActiva()
  const cargarDirector = useAppStore((s) => s.cargarDirector)
  const hayCambios = useAppStore((s) => s.hayCambiosSinGuardar)
  const sincronizarParticipantes = useAppStore((s) => s.sincronizarParticipantes)
  const sincronizando = useAppStore((s) => s.directorSincronizando)

  // Se intentó cerrar sesión con cambios sin guardar: pide confirmación.
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)

  // Edición cargada en el borrador, para detectar que el encargado la cambió
  // por realtime mientras el director trabajaba.
  const edicionEnBorrador = useAppStore((s) => s.directorEdicionId)

  useEffect(() => {
    if (!edicion?.id) return
    // El borrador de otra edición ya no sirve: cargarDirector lo reemplaza. Se
    // avisa porque el cambio viene de fuera (el encargado activó otra edición).
    if (edicionEnBorrador && edicionEnBorrador !== edicion.id) {
      toast(`La edición activa cambió a "${edicion.name}". Se recargaron ranking y títulos.`, {
        icon: '⚠️',
        duration: 6000,
      })
    }
    void cargarDirector(edicion.id)
  }, [edicion?.id, edicion?.name, edicionEnBorrador, cargarDirector])

  // Guardia ante recarga / cierre de pestaña.
  useEffect(() => {
    if (!hayCambios) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hayCambios])

  // La guardia SOLO cubre las salidas del módulo (botón Salir y recarga). Entre
  // las tabs no aplica: el borrador vive en el store, el layout no se desmonta
  // y no se pierde nada — avisar ahí solo confundía. No se usa useBlocker de
  // react-router porque exige un data router (createBrowserRouter) y la app
  // monta <BrowserRouter> + <Routes>; migrar eso queda fuera de alcance.

  // Relee participantes y asignaciones conservando el borrador en curso: el
  // encargado puede dar de alta participantes con el director ya trabajando.
  const handleSincronizar = () => {
    void toast.promise(sincronizarParticipantes(), {
      loading: 'Actualizando participantes...',
      success: 'Participantes actualizadas',
      error: (err: unknown) => mensajeError(err, 'Error al actualizar'),
    })
  }

  const handleSignOut = async () => {
    await toast.promise(signOut(), {
      loading: 'Cerrando sesión...',
      success: 'Sesión cerrada',
      error: 'Error al cerrar sesión',
    })
    navigate('/login', { replace: true })
  }

  const confirmarSalida = () => {
    setConfirmandoSalida(false)
    void handleSignOut()
  }

  const claseTab = ({ isActive }: { isActive: boolean }) =>
    `px-4 min-h-[44px] flex items-center flex-shrink-0 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-slate-800 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 0h14v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">Miss México</p>
              <p className="text-slate-400 text-xs truncate">{profile?.full_name ?? 'Director'}</p>
            </div>
          </div>

          <nav className="order-last lg:order-none w-full lg:w-auto lg:ml-auto flex items-center gap-1 overflow-x-auto">
            <button
              onClick={handleSincronizar}
              disabled={sincronizando}
              title="Volver a leer las participantes de la edición"
              className="px-3 min-h-[44px] flex items-center flex-shrink-0 text-sm font-medium
                rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50
                transition-colors"
            >
              {sincronizando ? 'Actualizando...' : 'Actualizar'}
            </button>
            <NavLink to="/director" end className={claseTab}>
              Promedios
            </NavLink>
            <NavLink to="/director/ranking" className={claseTab}>
              Ranking
            </NavLink>
            <NavLink to="/director/titulos" className={claseTab}>
              Títulos
            </NavLink>
          </nav>

          <button
            onClick={() => {
              if (hayCambios) {
                setConfirmandoSalida(true)
                return
              }
              void handleSignOut()
            }}
            className="flex items-center gap-2 px-3 min-h-[44px] flex-shrink-0 text-slate-300
              hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
        <BarraGuardado />
      </main>

      {confirmandoSalida && (
        <ConfirmDialog
          titulo="Tienes cambios sin guardar"
          mensaje="Si cierras sesión ahora se perderán el ranking y las asignaciones que no hayas guardado. ¿Salir de todos modos?"
          textoConfirmar="Salir sin guardar"
          textoCancelar="Seguir editando"
          peligro
          onConfirmar={confirmarSalida}
          onCancelar={() => setConfirmandoSalida(false)}
        />
      )}
    </div>
  )
}

export default DirectorLayout
