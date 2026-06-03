import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { etapaSchema } from '../schemas/etapa'
import { slugify } from '../utils/slugify'
import Modal from './Modal'
import type { Tables } from '../types/database'

interface Props {
  edicionId: string
  etapa?: Tables<'stages'>
  onClose: () => void
  onGuardado: () => void
}

interface FormErrors {
  name?: string
  order_num?: string
  cupo?: string
}

function EtapaModal({ edicionId, etapa, onClose, onGuardado }: Props) {
  const esEdicion = etapa !== undefined

  const [name, setName] = useState(etapa?.name ?? '')
  const [orderNum, setOrderNum] = useState(etapa?.order_num?.toString() ?? '')
  const [cupo, setCupo] = useState(etapa?.cupo?.toString() ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = etapaSchema.safeParse({
      name: name.trim(),
      order_num: parseInt(orderNum, 10),
      cupo: parseInt(cupo, 10),
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

    // El slug se deriva del nombre; el encargado no lo escribe a mano.
    const datos = {
      name: result.data.name,
      slug: slugify(result.data.name),
      order_num: result.data.order_num,
      cupo: result.data.cupo,
      edition_id: edicionId,
    }

    await toast.promise(
      (async () => {
        if (esEdicion) {
          const { error } = await supabase
            .from('stages')
            .update(datos)
            .eq('id', etapa.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('stages')
            .insert(datos)

          if (error) throw error
        }

        onGuardado()
        onClose()
      })(),
      {
        loading: esEdicion ? 'Actualizando etapa...' : 'Creando etapa...',
        success: esEdicion ? 'Etapa actualizada' : 'Etapa creada',
        error: (err: unknown) => {
          if (err instanceof Error) return err.message
          return 'Error al guardar'
        },
      }
    )

    setSubmitting(false)
  }

  return (
    <Modal titulo={esEdicion ? 'Editar etapa' : 'Nueva etapa'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Nombre de la etapa */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Nombre de la etapa <span className="text-red-500">*</span>
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
            placeholder="Ej. Semifinal 18"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        {/* Orden y cupo en fila */}
        <div className="grid grid-cols-2 gap-3">
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

          <div>
            <label htmlFor="cupo" className="block text-sm font-medium text-slate-700 mb-1">
              Cupo (cuántas pasan) <span className="text-red-500">*</span>
            </label>
            <input
              id="cupo"
              type="number"
              min={1}
              max={99}
              value={cupo}
              onChange={(e) => setCupo(e.target.value)}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors
                ${errors.cupo ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="18"
            />
            {errors.cupo && <p className="mt-1 text-xs text-red-600">{errors.cupo}</p>}
          </div>
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

export default EtapaModal
