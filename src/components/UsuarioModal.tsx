import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { usuarioCrearSchema, usuarioEditarSchema, rolesUsuario, etiquetaRol } from '../schemas/usuario'
import { generarPassword, copiarAlPortapapeles } from '../utils/credenciales'
import { mensajeError } from '../utils/mensaje-error'
import type { Usuario } from '../hooks/useUsuarios'
import type { UsuarioCrearFormData, UsuarioEditarFormData } from '../schemas/usuario'

interface Props {
  // Sin usuario = alta. Con usuario = edición de nombre y rol.
  usuario?: Usuario
  onCrear: (datos: UsuarioCrearFormData) => Promise<void>
  onActualizar: (userId: string, datos: UsuarioEditarFormData) => Promise<void>
  onClose: () => void
}

interface FormErrors {
  full_name?: string
  email?: string
  password?: string
  role?: string
}

function UsuarioModal({ usuario, onCrear, onActualizar, onClose }: Props) {
  const esEdicion = usuario !== undefined

  const [fullName, setFullName] = useState(usuario?.full_name ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  // El rol arranca en juez: es el alta que se hace decenas de veces por evento.
  const [role, setRole] = useState<Usuario['role']>(usuario?.role ?? 'juez')
  const [password, setPassword] = useState(generarPassword)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  // Al crear, el modal pasa a mostrar las credenciales: es la única vez que la
  // contraseña se puede leer, después ya no se recupera de ningún lado.
  const [credenciales, setCredenciales] = useState<{ email: string; password: string } | null>(null)

  const handleCopiar = async () => {
    if (!credenciales) return
    const texto = `Usuario: ${credenciales.email}\nContraseña: ${credenciales.password}`
    if (await copiarAlPortapapeles(texto)) {
      toast.success('Credenciales copiadas')
    } else {
      toast.error('No se pudo copiar. Anótalas manualmente.')
    }
  }

  const aplicarErrores = (issues: { path: PropertyKey[]; message: string }[]) => {
    const fieldErrors: FormErrors = {}
    for (const issue of issues) {
      const field = issue.path[0] as keyof FormErrors
      fieldErrors[field] = issue.message
    }
    setErrors(fieldErrors)
  }

  // Las dos ramas validan con schemas distintos y cada una usa el `data` ya
  // parseado: así el rol llega estrechado al enum, sin cast desde `null`.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const base = { full_name: fullName.trim(), role }

    if (esEdicion) {
      const result = usuarioEditarSchema.safeParse(base)
      if (!result.success) return aplicarErrores(result.error.issues)

      setSubmitting(true)
      try {
        await toast.promise(onActualizar(usuario.id, result.data), {
          loading: 'Actualizando usuario...',
          success: 'Usuario actualizado',
          error: (err: unknown) => mensajeError(err, 'Error al actualizar'),
        })
        onClose()
      } catch {
        // El toast ya mostró el detalle; el modal sigue abierto para reintentar.
      } finally {
        setSubmitting(false)
      }
      return
    }

    const result = usuarioCrearSchema.safeParse({
      ...base,
      email: email.trim().toLowerCase(),
      password,
    })
    if (!result.success) return aplicarErrores(result.error.issues)

    setSubmitting(true)
    try {
      await toast.promise(onCrear(result.data), {
        loading: 'Creando usuario...',
        success: 'Usuario creado',
        error: (err: unknown) => mensajeError(err, 'Error al crear'),
      })
      setCredenciales({ email: result.data.email, password: result.data.password })
    } catch {
      // El toast ya mostró el detalle; el modal sigue abierto para reintentar.
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- Vista de credenciales (post-alta) ----------
  if (credenciales) {
    return (
      <Modal titulo="Usuario creado" onClose={onClose}>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Entrégale estos datos a <span className="font-medium text-slate-900">{fullName.trim()}</span>.
            La contraseña no se puede volver a consultar: si se pierde, hay que crear una nueva.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 space-y-2">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</p>
              <p className="font-mono text-sm text-slate-900 break-all">{credenciales.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contraseña</p>
              <p className="font-mono text-sm text-slate-900">{credenciales.password}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => void handleCopiar()}
              className="flex-1 py-2 px-4 border border-gray-300 text-slate-700 font-medium rounded-lg text-sm
                hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Listo
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // ---------- Formulario ----------
  const claseInput = (hayError: boolean) =>
    `w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
     ${hayError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`

  return (
    <Modal titulo={esEdicion ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-1">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitting}
            className={claseInput(!!errors.full_name)}
            placeholder="Ej. Ana Ramírez"
          />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
            Rol <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            value={role ?? 'juez'}
            onChange={(e) => setRole(e.target.value as Usuario['role'])}
            disabled={submitting}
            className={claseInput(!!errors.role)}
          >
            {rolesUsuario.map((r) => (
              <option key={r} value={r}>{etiquetaRol[r]}</option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Correo <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            // El correo es el identificador de acceso: cambiarlo dejaría al
            // usuario sin poder entrar con lo que ya le entregaste.
            disabled={submitting || esEdicion}
            className={`${claseInput(!!errors.email)} disabled:bg-gray-100 disabled:text-slate-500`}
            placeholder="juez1@missmexico.mx"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          {esEdicion && (
            <p className="mt-1 text-xs text-slate-400">El correo de acceso no se puede cambiar.</p>
          )}
        </div>

        {!esEdicion && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className={`${claseInput(!!errors.password)} font-mono`}
              />
              <button
                type="button"
                onClick={() => setPassword(generarPassword())}
                disabled={submitting}
                className="px-3 py-2 border border-gray-300 text-slate-600 text-xs font-medium rounded-lg
                  hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Generar
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            <p className="mt-1 text-xs text-slate-400">
              Se muestra en claro a propósito: hay que entregarla al usuario.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2 px-4 border border-gray-300 text-slate-700 font-medium rounded-lg text-sm
              hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400
              text-white font-medium rounded-lg text-sm transition-colors
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {submitting ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UsuarioModal
