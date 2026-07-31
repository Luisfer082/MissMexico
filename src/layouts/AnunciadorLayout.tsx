import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '../stores/useAppStore'

// Layout del módulo Anunciador (Fase 7 — v1). Header oscuro estilo director +
// tabs para sus dos vistas: Proyección (lo que ve el escenario) y Control (donde
// el operador revela los títulos uno por uno). v1 es "misma pantalla": el
// operador alterna entre ambas pestañas; el estado vive en memoria (Zustand).
function AnunciadorLayout() {
  const navigate = useNavigate()
  const profile = useAppStore((s) => s.profile)
  const signOut = useAppStore((s) => s.signOut)

  const handleSignOut = async () => {
    await toast.promise(signOut(), {
      loading: 'Cerrando sesión...',
      success: 'Sesión cerrada',
      error: 'Error al cerrar sesión',
    })
    navigate('/login', { replace: true })
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
              <p className="text-slate-400 text-xs truncate">{profile?.full_name ?? 'Anunciador'}</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink to="/anunciador" end className={claseTab}>
              Proyección
            </NavLink>
            <NavLink to="/anunciador/control" className={claseTab}>
              Control
            </NavLink>
          </nav>

          <button
            onClick={() => void handleSignOut()}
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
      </main>
    </div>
  )
}

export default AnunciadorLayout
