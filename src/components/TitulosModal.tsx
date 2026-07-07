import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { tituloNombreSchema } from '../schemas/titulo'
import { seedTitulos } from '../utils/seed-titulos'
import Modal from './Modal'
import type { Tables } from '../types/database'

type Titulo = Tables<'titles'>

interface Props {
  edicionId: string
  edicionNombre: string
  onClose: () => void
}

// Modal "Títulos" del módulo Encargado (Fase 6, paso 2): renombra el catálogo
// de títulos de una edición. Si la edición no tiene títulos (creada antes del
// seed automático), permite generar los 8 estándar.
function TitulosModal({ edicionId, edicionNombre, onClose }: Props) {
  const [titulos, setTitulos] = useState<Titulo[]>([])
  // Nombres editables, indexados por id del título
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    let cancelado = false

    supabase
      .from('titles')
      .select('*')
      .eq('edition_id', edicionId)
      .order('order_num', { ascending: true })
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) {
          toast.error(error.message)
        } else {
          const lista = data ?? []
          setTitulos(lista)
          setNombres(Object.fromEntries(lista.map((t) => [t.id, t.name])))
        }
        setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [edicionId, recarga])

  const handleGenerar = async () => {
    setSubmitting(true)
    await toast.promise(
      (async () => {
        await seedTitulos(edicionId)
        setRecarga((n) => n + 1)
      })(),
      {
        loading: 'Generando títulos...',
        success: 'Títulos estándar generados',
        error: (err: unknown) => (err instanceof Error ? err.message : 'Error al generar'),
      },
    )
    setSubmitting(false)
  }

  const handleGuardar = async () => {
    // Validar todos los nombres antes de tocar la BD
    const nuevosErrores: Record<string, string> = {}
    for (const t of titulos) {
      const result = tituloNombreSchema.safeParse(nombres[t.id] ?? '')
      if (!result.success) {
        nuevosErrores[t.id] = result.error.issues[0]?.message ?? 'Nombre inválido'
      }
    }
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    // Solo actualizar los que cambiaron
    const cambiados = titulos.filter((t) => nombres[t.id]?.trim() !== t.name)
    if (cambiados.length === 0) {
      onClose()
      return
    }

    setSubmitting(true)
    await toast.promise(
      (async () => {
        for (const t of cambiados) {
          const { error } = await supabase
            .from('titles')
            .update({ name: nombres[t.id].trim() })
            .eq('id', t.id)
          if (error) throw error
        }
        onClose()
      })(),
      {
        loading: 'Guardando títulos...',
        success: 'Títulos actualizados',
        error: (err: unknown) => (err instanceof Error ? err.message : 'Error al guardar'),
      },
    )
    setSubmitting(false)
  }

  return (
    <Modal titulo={`Títulos — ${edicionNombre}`} onClose={onClose}>
      <div className="px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : titulos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Esta edición no tiene títulos.</p>
            <button
              onClick={() => void handleGenerar()}
              disabled={submitting}
              className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400
                text-white text-sm font-medium rounded-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Generar títulos estándar (6 títulos + 2 finalistas)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {titulos.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium w-20 flex-shrink-0
                    ${t.kind === 'titulo' ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {t.kind === 'titulo' ? 'Título' : 'Finalista'}
                </span>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={nombres[t.id] ?? ''}
                    onChange={(e) => setNombres((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    disabled={submitting}
                    aria-label={`Nombre del título ${t.order_num}`}
                    className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                      focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
                      ${errores[t.id] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errores[t.id] && <p className="mt-1 text-xs text-red-600">{errores[t.id]}</p>}
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-3">
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
                type="button"
                onClick={() => void handleGuardar()}
                disabled={submitting}
                className="flex-1 py-2 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400
                  text-white font-medium rounded-lg text-sm transition-colors
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default TitulosModal
