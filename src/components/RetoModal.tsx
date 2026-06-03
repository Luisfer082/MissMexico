import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { retoSchema } from '../schemas/reto'
import Modal from './Modal'
import type { Tables } from '../types/database'

interface Props {
  edicionId: string
  reto?: Tables<'challenges'>
  onClose: () => void
  onGuardado: () => void
}

interface FormErrors {
  name?: string
  description?: string
  order_num?: string
}

function RetoModal({ edicionId, reto, onClose, onGuardado }: Props) {
  const esEdicion = reto !== undefined

  const [name, setName] = useState(reto?.name ?? '')
  const [description, setDescription] = useState(reto?.description ?? '')
  const [orderNum, setOrderNum] = useState(reto?.order_num?.toString() ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = retoSchema.safeParse({
      name: name.trim(),
      description: description.trim() === '' ? undefined : description.trim(),
      order_num: parseInt(orderNum, 10),
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
      name: result.data.name,
      description: result.data.description || null,
      order_num: result.data.order_num,
      edition_id: edicionId,
    }

    await toast.promise(
      (async () => {
        if (esEdicion) {
          const { error } = await supabase
            .from('challenges')
            .update(datos)
            .eq('id', reto.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('challenges')
            .insert(datos)

          if (error) throw error
        }

        onGuardado()
        onClose()
      })(),
      {
        loading: esEdicion ? 'Actualizando reto...' : 'Creando reto...',
        success: esEdicion ? 'Reto actualizado' : 'Reto creado',
        error: (err: unknown) => {
          if (err instanceof Error) return err.message
          return 'Error al guardar'
        },
      }
    )

    setSubmitting(false)
  }

  return (
    <Modal titulo={esEdicion ? 'Editar reto' : 'Nuevo reto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Nombre del reto y orden en fila */}
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del reto <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors
                ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="Ej. Traje típico"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="order_num" className="block text-sm font-medium text-slate-700 mb-1">
              Orden <span className="text-red-500">*</span>
            </label>
            <input
              id="order_num"
              type="number"
              min={1}
              max={99}
              value={orderNum}
              onChange={(e) => setOrderNum(e.target.value)}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors
                ${errors.order_num ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="1"
            />
            {errors.order_num && <p className="mt-1 text-xs text-red-600">{errors.order_num}</p>}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            Descripción <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400 resize-none
              focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors
              ${errors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            placeholder="Detalles del reto..."
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
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
            className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400
              text-white font-medium rounded-lg text-sm transition-colors
              focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            {submitting ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default RetoModal
