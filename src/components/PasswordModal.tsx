import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { generarPassword, copiarAlPortapapeles } from '../utils/credenciales'
import { mensajeError } from '../utils/mensaje-error'
import type { Usuario } from '../hooks/useUsuarios'

interface Props {
  usuario: Usuario
  onAplicar: (userId: string, password: string) => Promise<void>
  onClose: () => void
}

// Resetear la contraseña de un usuario existente (Fase 9, paso 9).
//
// Antes esto no existía: si un juez perdía su contraseña había que eliminarlo
// y recrearlo, y como judge_scores.judge_id es "on delete cascade" eso se
// llevaba TODAS sus calificaciones por delante (reglas 1 y 3). Aquí sigue
// siendo el mismo usuario, con su historial intacto.
//
// La contraseña se genera y se muestra DESPUÉS de aplicarla, no antes: si se
// mostrara primero y la llamada fallara, el encargado se llevaría anotada una
// contraseña que no existe.
function PasswordModal({ usuario, onAplicar, onClose }: Props) {
  const [nueva, setNueva] = useState<string | null>(null)
  const [aplicando, setAplicando] = useState(false)

  const nombre = usuario.full_name ?? usuario.email ?? 'este usuario'

  const handleAplicar = async () => {
    setAplicando(true)
    const password = generarPassword()
    try {
      await onAplicar(usuario.id, password)
      setNueva(password)
      toast.success('Contraseña actualizada')
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo cambiar la contraseña'))
    } finally {
      setAplicando(false)
    }
  }

  const handleCopiar = async () => {
    if (!nueva) return
    const texto = `Usuario: ${usuario.email ?? ''}\nContraseña: ${nueva}`
    if (await copiarAlPortapapeles(texto)) {
      toast.success('Credenciales copiadas')
    } else {
      toast.error('No se pudo copiar. Anótalas manualmente.')
    }
  }

  return (
    <Modal titulo="Cambiar contraseña" onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        {nueva === null ? (
          <>
            <p className="text-sm text-slate-600">
              Se generará una contraseña nueva para <strong>{nombre}</strong>. La anterior deja de
              funcionar de inmediato y tendrás que entregarle la nueva en mano.
            </p>
            <p className="text-sm text-slate-500">
              Su historial de calificaciones no se toca: sigue siendo el mismo usuario.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] px-4 rounded-lg border border-gray-200 text-sm
                  font-medium text-slate-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleAplicar()}
                disabled={aplicando}
                className="flex-1 min-h-[44px] px-4 rounded-lg bg-brand-600 text-white text-sm
                  font-semibold hover:bg-brand-700 transition-colors disabled:bg-gray-300
                  disabled:cursor-not-allowed"
              >
                {aplicando ? 'Cambiando...' : 'Generar y aplicar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900 font-medium">
                Esta es la única vez que puedes leer la contraseña.
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Cópiala ahora; después no se recupera de ningún lado.
              </p>
            </div>

            <dl className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
              <div className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-slate-500">Usuario</dt>
                <dd className="font-medium text-slate-900 truncate">{usuario.email ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-slate-500">Contraseña</dt>
                <dd className="font-mono font-semibold text-slate-900">{nueva}</dd>
              </div>
            </dl>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleCopiar()}
                className="flex-1 min-h-[44px] px-4 rounded-lg border border-gray-200 text-sm
                  font-medium text-slate-600 hover:bg-gray-50 transition-colors"
              >
                Copiar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] px-4 rounded-lg bg-brand-600 text-white text-sm
                  font-semibold hover:bg-brand-700 transition-colors"
              >
                Listo
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default PasswordModal
