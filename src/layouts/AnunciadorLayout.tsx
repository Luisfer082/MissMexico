import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '../stores/useAppStore'
import { useEdicionActiva } from '../hooks/useEdicionActiva'
import FondoApp from '../components/FondoApp'

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
        ? 'bg-white/15 text-white ring-1 ring-celeste-400/60'
        : 'text-brand-100 hover:text-white hover:bg-white/10'
    }`

  return (
    <div className="relative isolate min-h-screen flex flex-col">
      <FondoApp />
      {/* Header */}
      <header className="sticky top-0 z-20 bg-marino-950/85 backdrop-blur text-white">
        {/* En celular las 2 pestañas + identidad + Salir no caben en una fila
            (~404px en 375px de ancho): la nav baja a su propia línea, igual que
            en DirectorLayout. Desde sm: vuelve a la fila única de siempre. */}
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
            <div className="w-8 h-8 bg-gradient-to-br from-celeste-400 to-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 0h14v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">Miss México</p>
              <p className="text-brand-200 text-xs truncate">{profile?.full_name ?? 'Anunciador'}</p>
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
            className="flex items-center gap-2 px-3 min-h-[44px] flex-shrink-0 text-brand-100 hover:text-white
              hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido: panel claro sobre el fondo (mismo gray-50 de antes). La
          Proyección no lo usa: es una capa fija y opaca por encima de todo. */}
      <main className="w-full max-w-5xl mx-auto flex-1 px-4 py-6 bg-gray-50/95
        sm:flex-none sm:my-6 sm:rounded-2xl sm:shadow-xl sm:shadow-black/20">
        <Outlet />
      </main>
    </div>
  )
}

export default AnunciadorLayout
