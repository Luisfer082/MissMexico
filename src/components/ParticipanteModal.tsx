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

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-slate-900">
            {esEdicion ? 'Editar participante' : 'Nueva participante'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
                ${errors.full_name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
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
                className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
                  ${errors.sash_number ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
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
                className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
                  ${errors.region ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder="Ej. Jalisco"
              />
              {errors.region && <p className="mt-1 text-xs text-red-600">{errors.region}</p>}
            </div>
          </div>

          {/* URL de foto */}
          <div>
            <label htmlFor="photo_url" className="block text-sm font-medium text-slate-700 mb-1">
              URL de foto <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              id="photo_url"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
                ${errors.photo_url ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="https://..."
            />
            {errors.photo_url && <p className="mt-1 text-xs text-red-600">{errors.photo_url}</p>}
          </div>

          {/* Botones */}
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
              {submitting ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ParticipanteModal
