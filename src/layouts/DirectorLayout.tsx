import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '../stores/useAppStore'
import { useEdicionActiva } from '../hooks/useEdicionActiva'
import BarraGuardado from '../components/BarraGuardado'
import ConfirmDialog from '../components/ConfirmDialog'

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

  // Destino al que se quiere navegar mientras hay cambios sin guardar.
  const [destinoPendiente, setDestinoPendiente] = useState<string | null>(null)

  useEffect(() => {
    if (edicion?.id) void cargarDirector(edicion.id)
  }, [edicion?.id, cargarDirector])

  // Guardia ante recarga / cierre de pestaña.
  useEffect(() => {
    if (!hayCambios) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hayCambios])

  // Guardia ante navegación interna. No se usa useBlocker de react-router
  // porque exige un data router (createBrowserRouter) y la app monta
  // <BrowserRouter> + <Routes>; migrar eso queda fuera de alcance. Como las
  // únicas salidas del módulo son estas tabs y el botón Salir, basta con
  // interceptarlas aquí.
  const navegarConGuardia = (destino: string) => (e: React.MouseEvent) => {
    if (!hayCambios) return
    e.preventDefault()
    setDestinoPendiente(destino)
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
    const destino = destinoPendiente
    setDestinoPendiente(null)
    if (destino === '/login') {
      void handleSignOut()
    } else if (destino) {
      navigate(destino)
    }
  }

  const claseTab = ({ isActive }: { isActive: boolean }) =>
    `px-4 min-h-[44px] flex items-center text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-slate-800 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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

          <nav className="flex items-center gap-1">
            <NavLink to="/director" end className={claseTab} onClick={navegarConGuardia('/director')}>
              Promedios
            </NavLink>
            <NavLink
              to="/director/ranking"
              className={claseTab}
              onClick={navegarConGuardia('/director/ranking')}
            >
              Ranking
            </NavLink>
            <NavLink
              to="/director/titulos"
              className={claseTab}
              onClick={navegarConGuardia('/director/titulos')}
            >
              Títulos
            </NavLink>
          </nav>

          <button
            onClick={() => {
              if (hayCambios) {
                setDestinoPendiente('/login')
                return
              }
              void handleSignOut()
            }}
            className="flex items-center gap-2 px-3 min-h-[44px] text-slate-300 hover:text-white
              hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
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

      {destinoPendiente !== null && (
        <ConfirmDialog
          titulo="Tienes cambios sin guardar"
          mensaje="Si sales ahora se perderán el ranking y las asignaciones que no hayas guardado. ¿Salir de todos modos?"
          textoConfirmar="Salir sin guardar"
          textoCancelar="Seguir editando"
          peligro
          onConfirmar={confirmarSalida}
          onCancelar={() => setDestinoPendiente(null)}
        />
      )}
    </div>
  )
}

export default DirectorLayout
