import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '../stores/useAppStore'
import { loginSchema } from '../schemas/auth'
import type { Database } from '../types/database'

type AppRole = Database['public']['Enums']['app_role']

// Mapa de rol → ruta destino
const ROLE_ROUTES: Record<AppRole, string> = {
  encargado: '/encargado',
  juez: '/juez',
  director: '/director',
  anunciador: '/anunciador',
}

function LoginPage() {
  const navigate = useNavigate()
  const signIn = useAppStore((s) => s.signIn)
  const profile = useAppStore((s) => s.profile)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validación con Zod
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'email' | 'password'
        fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)

    await toast.promise(
      (async () => {
        await signIn(email, password)

        // Cargar el perfil actualizado desde el store (ya actualizado por onAuthStateChange)
        // Necesitamos leer el profile después del signIn
        // Pequeña espera para que el listener de auth procese el estado
        await new Promise<void>((resolve) => setTimeout(resolve, 300))

        // Leer el profile del store después del login
        const currentProfile = useAppStore.getState().profile

        if (!currentProfile?.role) {
          throw new Error('Usuario sin rol asignado')
        }

        const destino = ROLE_ROUTES[currentProfile.role]
        navigate(destino)
      })(),
      {
        loading: 'Iniciando sesión...',
        success: 'Sesión iniciada',
        error: (err: unknown) => {
          if (err instanceof Error) return err.message
          return 'Error al iniciar sesión'
        },
      }
    )

    setSubmitting(false)
  }

  // Si ya está autenticado y tiene perfil, redirigir
  if (profile?.role) {
    const destino = ROLE_ROUTES[profile.role]
    navigate(destino, { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-600 rounded-full mb-4">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Miss México</h1>
          <p className="mt-1 text-sm text-slate-500">Sistema de Calificaciones en Vivo</p>
        </div>

        {/* Card del formulario */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Campo email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent
                  transition-colors ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder="usuario@ejemplo.com"
                disabled={submitting}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Campo contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent
                  transition-colors ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder="••••••••"
                disabled={submitting}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Botón submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400
                text-white font-medium rounded-lg text-sm transition-colors
                focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            >
              {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Miss México {new Date().getFullYear()} — Acceso restringido
        </p>
      </div>
    </div>
  )
}

export default LoginPage
