import { Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '../stores/useAppStore'
import FondoApp from '../components/FondoApp'

// Layout del módulo Juez. A diferencia del encargado, usa un header superior
// (sin sidebar) porque los jueces operan en tablet y necesitan el ancho completo.
function JuezLayout() {
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

  return (
    <div className="relative isolate min-h-screen">
      <FondoApp />
      {/* Header */}
      <header className="sticky top-0 z-20 bg-marino-950/85 backdrop-blur text-white">
        <div className="max-w-3xl mx-auto px-4 h-[68px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-celeste-400 to-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 0h14v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">Miss México</p>
              <p className="text-brand-200 text-xs truncate">{profile?.full_name ?? 'Juez'}</p>
            </div>
          </div>
          <button
            onClick={() => void handleSignOut()}
            className="flex items-center gap-2 px-3 min-h-[44px] text-brand-100 hover:text-white
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

      {/* Contenido: panel claro sobre el fondo. Es el mismo gray-50 de antes,
          así que tarjetas, tablas y la barra sticky se ven igual que siempre.
          En celular va de borde a borde para no quitarle ancho al juez. */}
      <main className="max-w-3xl mx-auto px-4 py-6 bg-gray-50/95 min-h-[calc(100vh-68px)]
        sm:min-h-0 sm:my-6 sm:rounded-2xl sm:shadow-xl sm:shadow-black/20">
        <Outlet />
      </main>
    </div>
  )
}

export default JuezLayout
