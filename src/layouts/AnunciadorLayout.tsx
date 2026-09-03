import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '../stores/useAppStore'
import { useEdicionActiva } from '../hooks/useEdicionActiva'

// Layout del módulo Anunciador. Header oscuro estilo director + tabs para sus
// dos vistas: Proyección (el show: título grande + botón de revelar, todo en la
// misma pantalla) y Orden (donde se define en qué orden se revelan).
//
// OJO: Proyección se dibuja a pantalla completa POR ENCIMA de este header
// (fixed inset-0), a propósito: el proyector no debe mostrar el nombre del
// usuario ni las pestañas. Se vuelve aquí desde el botón "Cambiar orden" de sus
// controles. El header sí se ve mientras no hay títulos que proyectar.
//
// Carga aquí los títulos de la edición activa, una sola vez para las dos
// pestañas.
function AnunciadorLayout() {
  const navigate = useNavigate()
  const profile = useAppStore((s) => s.profile)
  const signOut = useAppStore((s) => s.signOut)
  const { edicion } = useEdicionActiva()
  const cargarAnuncio = useAppStore((s) => s.cargarAnuncio)

  useEffect(() => {
    if (edicion?.id) void cargarAnuncio(edicion.id)
  }, [edicion?.id, cargarAnuncio])

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
        {/* En celular las 2 pestañas + identidad + Salir no caben en una fila
            (~404px en 375px de ancho): la nav baja a su propia línea, igual que
            en DirectorLayout. Desde sm: vuelve a la fila única de siempre. */}
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
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

          <nav className="order-last sm:order-none w-full sm:w-auto sm:ml-auto flex items-center gap-1">
            <NavLink to="/anunciador" end className={claseTab}>
              Proyección
            </NavLink>
            <NavLink to="/anunciador/orden" className={claseTab}>
              Orden
            </NavLink>
          </nav>

          <button
            onClick={() => void handleSignOut()}
            className="flex items-center gap-2 px-3 min-h-[44px] flex-shrink-0 text-slate-300 hover:text-white
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
