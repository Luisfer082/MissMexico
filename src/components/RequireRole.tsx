import { Navigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import type { Database } from '../types/database'

type AppRole = Database['public']['Enums']['app_role']

interface Props {
  roles: AppRole[]
  children: React.ReactNode
}

function RequireRole({ roles, children }: Props) {
  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)
  const loading = useAppStore((s) => s.loading)

  // Spinner mientras se resuelve la sesión inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando...</p>
        </div>
      </div>
    )
  }

  // No autenticado → login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Autenticado pero sin perfil o rol no permitido
  if (!profile?.role || !roles.includes(profile.role)) {
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
          <Navigate to="/login" replace />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default RequireRole
