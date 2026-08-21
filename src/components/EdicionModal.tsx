import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { edicionSchema } from '../schemas/edicion'
import { seedTitulos } from '../utils/seed-titulos'
import Modal from './Modal'
import type { Tables } from '../types/database'
import { mensajeError } from '../utils/mensaje-error'

interface Props {
  edicion?: Tables<'editions'>
  onClose: () => void
  onGuardado: () => void
}

interface FormErrors {
  name?: string
  year?: string
}

function EdicionModal({ edicion, onClose, onGuardado }: Props) {
  const esEdicion = edicion !== undefined

  const [name, setName] = useState(edicion?.name ?? '')
  const [year, setYear] = useState(edicion?.year?.toString() ?? new Date().getFullYear().toString())
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = edicionSchema.safeParse({
      name: name.trim(),
      year: parseInt(year, 10),
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

    // La edición nace inactiva: activar es una acción aparte para no chocar
    // con el índice único que permite una sola edición activa a la vez.
    const datos = {
      name: result.data.name,
      year: result.data.year,
    }

    await toast.promise(
      (async () => {
        if (esEdicion) {
          const { error } = await supabase
            .from('editions')
            .update(datos)
            .eq('id', edicion.id)

          if (error) throw error
        } else {
          const { data: creada, error } = await supabase
            .from('editions')
            .insert(datos)
            .select('id')
            .single()

          if (error) throw error

          // Seed del catálogo de títulos (6 títulos + 2 finalistas). Si falla,
          // la edición ya existe: avisar sin revertir; el modal "Títulos" de
          // Ediciones permite generarlos después.
          try {
            await seedTitulos(creada.id)
          } catch {
            toast.error(
              'Edición creada, pero no se generaron sus títulos. Usa el botón "Títulos" para generarlos.',
            )
          }
        }

        onGuardado()
        onClose()
      })(),
      {
        loading: esEdicion ? 'Actualizando edición...' : 'Creando edición...',
        success: esEdicion ? 'Edición actualizada' : 'Edición creada',
        error: (err: unknown) => {
          return mensajeError(err, 'Error al guardar')
        },
      }
    )

    setSubmitting(false)
  }

  return (
    <Modal titulo={esEdicion ? 'Editar edición' : 'Nueva edición'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Nombre y año en fila */}
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de la edición <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
                ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="Ej. Miss México 2026"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1">
              Año <span className="text-red-500">*</span>
            </label>
            <input
              id="year"
              type="number"
              min={2000}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={submitting}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
                ${errors.year ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="2026"
            />
            {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year}</p>}
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

export default EdicionModal
