import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'

function NoAutorizado() {
  const navigate = useNavigate()
  const signOut = useAppStore((s) => s.signOut)

  const handleSalir = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.068 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Acceso no autorizado</h1>
        <p className="text-sm text-slate-500 mb-6">
          No tienes permisos para acceder a esta sección.
        </p>
        <button
          onClick={handleSalir}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}

export default NoAutorizado
