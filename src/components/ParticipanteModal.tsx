import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { participanteSchema } from '../schemas/participante'
import type { Tables } from '../types/database'

interface Props {
  edicionId: string
  participante?: Tables<'participants'>
  onClose: () => void
  onGuardado: () => void
}

interface FormErrors {
  full_name?: string
  sash_number?: string
  region?: string
  photo_url?: string
}

// Vista previa de foto en el modal. La prop `key` del padre (photoUrl) fuerza
// remount al cambiar la URL, reseteando imgError sin useEffect extra.
function FotoPreview({ nombre, photoUrl }: { nombre: string; photoUrl: string }) {
  const [imgError, setImgError] = useState(false)
  const inicial = (nombre.trim().charAt(0) || '?').toUpperCase()

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-50 rounded-lg border border-brand-100">
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt="Vista previa"
          className="w-12 h-12 rounded-lg object-cover bg-brand-100 flex-shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 select-none">
          <span className="text-white text-base font-bold">{inicial}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-brand-700">Vista previa</p>
        <p className="text-xs text-brand-500 mt-0.5">
          {imgError
            ? 'URL inválida — se mostrará la inicial'
            : 'Así aparecerá en la lista'}
        </p>
      </div>
    </div>
  )
}

function ParticipanteModal({ edicionId, participante, onClose, onGuardado }: Props) {
  const esEdicion = participante !== undefined

  const [fullName, setFullName] = useState(participante?.full_name ?? '')
  const [sashNumber, setSashNumber] = useState(participante?.sash_number?.toString() ?? '')
  const [region, setRegion] = useState(participante?.region ?? '')
  const [photoUrl, setPhotoUrl] = useState(participante?.photo_url ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = participanteSchema.safeParse({
      full_name: fullName.trim(),
      sash_number: parseInt(sashNumber, 10),
      region: region.trim(),
      photo_url: photoUrl.trim() === '' ? undefined : photoUrl.trim(),
    })

    if (!result.success) {
      const fieldErrors: FormErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors
        fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)

    const datos = {
      full_name: result.data.full_name,
      sash_number: result.data.sash_number,
      region: result.data.region,
      photo_url: result.data.photo_url || null,
      edition_id: edicionId,
    }

    await toast.promise(
      (async () => {
        if (esEdicion) {
          const { error } = await supabase
            .from('participants')
            .update(datos)
            .eq('id', participante.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('participants')
            .insert(datos)

          if (error) throw error
        }

        onGuardado()
        onClose()
      })(),
      {
        loading: esEdicion ? 'Actualizando participante...' : 'Registrando participante...',
        success: esEdicion ? 'Participante actualizada' : 'Participante registrada',
        error: (err: unknown) => {
          if (err instanceof Error) return err.message
          return 'Error al guardar'
        },
      }
    )

    setSubmitting(false)
  }

  // Clases base compartidas para inputs del formulario
  const inputBase =
    'w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors'

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header del modal con acento de color según modo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* Ícono indicador del modo: crear vs. editar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
              ${esEdicion ? 'bg-slate-100' : 'bg-brand-100'}`}>
              {esEdicion ? (
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              )}
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {esEdicion ? 'Editar participante' : 'Nueva participante'}
            </h2>
          </div>

          {/* Botón cerrar: w-11 h-11 para touch target de 44 px */}
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-400
              hover:text-slate-600 hover:bg-gray-100 transition-colors
              focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nombre completo */}
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
              className={`${inputBase} ${errors.full_name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="Ej. María Fernanda García López"
            />
            {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
          </div>

          {/* Número de banda y región en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sash_number" className="block text-sm font-medium text-slate-700 mb-1">
                No. de banda <span className="text-red-500">*</span>
              </label>
              <input
                id="sash_number"
                type="number"
                min={1}
                max={999}
                value={sashNumber}
                onChange={(e) => setSashNumber(e.target.value)}
                disabled={submitting}
                className={`${inputBase} ${errors.sash_number ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder="1"
              />
              {errors.sash_number && <p className="mt-1 text-xs text-red-600">{errors.sash_number}</p>}
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium text-slate-700 mb-1">
                Región <span className="text-red-500">*</span>
              </label>
              <input
                id="region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={submitting}
                className={`${inputBase} ${errors.region ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder="Ej. Jalisco"
              />
              {errors.region && <p className="mt-1 text-xs text-red-600">{errors.region}</p>}
            </div>
          </div>

          {/* URL de foto */}
          <div>
            <label htmlFor="photo_url" className="block text-sm font-medium text-slate-700 mb-1">
              URL de foto{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              id="photo_url"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              disabled={submitting}
              className={`${inputBase} ${errors.photo_url ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="https://..."
            />
            {errors.photo_url && <p className="mt-1 text-xs text-red-600">{errors.photo_url}</p>}

            {/* Vista previa de la foto — solo cuando hay URL.
                key=photoUrl fuerza remount al cambiar la URL y resetea imgError. */}
            {photoUrl.trim() !== '' && (
              <div className="mt-2">
                <FotoPreview
                  key={photoUrl.trim()}
                  nombre={fullName || 'Participante'}
                  photoUrl={photoUrl.trim()}
                />
              </div>
            )}
          </div>

          {/* Botones: h-11 para touch target de 44 px */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-11 px-4 flex items-center justify-center
                border border-gray-300 text-slate-700 font-medium rounded-lg text-sm
                hover:bg-gray-50 transition-colors
                focus:outline-none focus:ring-2 focus:ring-gray-300
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 px-4 flex items-center justify-center
                bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300
                text-white font-medium rounded-lg text-sm transition-colors
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                disabled:cursor-not-allowed"
            >
              {submitting ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ParticipanteModal
