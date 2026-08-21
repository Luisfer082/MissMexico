import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { tituloNombreSchema } from '../schemas/titulo'
import { seedTitulos } from '../utils/seed-titulos'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import type { Tables } from '../types/database'
import { mensajeError } from '../utils/mensaje-error'

type Titulo = Tables<'titles'>
type TipoTitulo = 'titulo' | 'finalista'

interface Props {
  edicionId: string
  edicionNombre: string
  onClose: () => void
}

// Modal "Títulos" del módulo Encargado (Fase 6, paso 2; alta/baja agregadas el
// 2026-08-04 a pedido de Luis). Administra el catálogo de una edición:
// renombrar (en lote, con Guardar), agregar y quitar títulos. Si la edición no
// tiene ninguno (creada antes del seed automático), permite generar los estándar.
//
// Alta y baja se aplican en el momento porque son operaciones atómicas sobre una
// fila; el renombrado sigue siendo en lote. Ninguna refetchea la lista: se
// actualiza en memoria para no perder los nombres que se estén editando.
function TitulosModal({ edicionId, edicionNombre, onClose }: Props) {
  const [titulos, setTitulos] = useState<Titulo[]>([])
  // Nombres editables, indexados por id del título
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [recarga, setRecarga] = useState(0)

  // Títulos que ya tienen participante asignada: borrarlos arrastra la
  // asignación (title_assignments.title_id es on delete cascade).
  const [asignados, setAsignados] = useState<Set<string>>(new Set())

  // Alta
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<TipoTitulo>('titulo')
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null)

  // Baja
  const [porBorrar, setPorBorrar] = useState<Titulo | null>(null)

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      const [{ data, error }, { data: asignaciones, error: errorAsign }] = await Promise.all([
        supabase
          .from('titles')
          .select('*')
          .eq('edition_id', edicionId)
          .order('order_num', { ascending: true }),
        supabase.from('title_assignments').select('title_id').eq('edition_id', edicionId),
      ])
      if (cancelado) return

      if (error || errorAsign) {
        toast.error((error ?? errorAsign)?.message ?? 'Error al cargar los títulos')
      } else {
        const lista = data ?? []
        setTitulos(lista)
        setNombres(Object.fromEntries(lista.map((t) => [t.id, t.name])))
        setAsignados(new Set((asignaciones ?? []).map((a) => a.title_id)))
      }
      setLoading(false)
    }

    void cargar()
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
        error: (err: unknown) => mensajeError(err, 'Error al generar'),
      },
    )
    setSubmitting(false)
  }

  const handleAgregar = async () => {
    const result = tituloNombreSchema.safeParse(nuevoNombre)
    if (!result.success) {
      setErrorNuevo(result.error.issues[0]?.message ?? 'Nombre inválido')
      return
    }
    setErrorNuevo(null)

    // El unique (edition_id, order_num) obliga a no repetir: se toma el mayor
    // actual + 1, así los huecos que dejen las bajas no estorban.
    const siguiente = titulos.reduce((max, t) => Math.max(max, t.order_num), 0) + 1

    setSubmitting(true)
    await toast.promise(
      (async () => {
        const { data, error } = await supabase
          .from('titles')
          .insert({
            edition_id: edicionId,
            name: result.data,
            order_num: siguiente,
            kind: nuevoTipo,
          })
          .select()
          .single()
        if (error) throw error

        setTitulos((prev) => [...prev, data])
        setNombres((prev) => ({ ...prev, [data.id]: data.name }))
        setNuevoNombre('')
      })(),
      {
        loading: 'Agregando título...',
        success: 'Título agregado',
        error: (err: unknown) => mensajeError(err, 'Error al agregar'),
      },
    )
    setSubmitting(false)
  }

  const handleBorrar = async (titulo: Titulo) => {
    setPorBorrar(null)
    setSubmitting(true)
    await toast.promise(
      (async () => {
        const { error } = await supabase.from('titles').delete().eq('id', titulo.id)
        if (error) throw error

        setTitulos((prev) => prev.filter((t) => t.id !== titulo.id))
        setNombres((prev) => {
          const copia = { ...prev }
          delete copia[titulo.id]
          return copia
        })
        setAsignados((prev) => {
          const copia = new Set(prev)
          copia.delete(titulo.id)
          return copia
        })
      })(),
      {
        loading: 'Quitando título...',
        success: 'Título quitado',
        error: (err: unknown) => mensajeError(err, 'Error al quitar'),
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
        error: (err: unknown) => mensajeError(err, 'Error al guardar'),
      },
    )
    setSubmitting(false)
  }

  return (
    <>
      <Modal titulo={`Títulos — ${edicionNombre}`} onClose={onClose}>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {titulos.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-sm">Esta edición no tiene títulos.</p>
                  <button
                    onClick={() => void handleGenerar()}
                    disabled={submitting}
                    className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400
                      text-white text-sm font-medium rounded-lg transition-colors
                      focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                    Generar títulos estándar (5 títulos + 2 finalistas)
                  </button>
                  <p className="text-xs text-slate-400 mt-3">O agrégalos uno por uno abajo.</p>
                </div>
              ) : (
                titulos.map((t) => (
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
                    <button
                      type="button"
                      onClick={() => setPorBorrar(t)}
                      disabled={submitting}
                      aria-label={`Quitar ${t.name}`}
                      title="Quitar título"
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                        disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400
                        transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              )}

              {/* Alta de un título nuevo */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Agregar título
                </p>
                <div className="flex items-start gap-2">
                  <select
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value as TipoTitulo)}
                    disabled={submitting}
                    aria-label="Tipo del título nuevo"
                    className="px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-slate-900 bg-white
                      focus:outline-none focus:ring-2 focus:ring-brand-500 flex-shrink-0"
                  >
                    <option value="titulo">Título</option>
                    <option value="finalista">Finalista</option>
                  </select>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleAgregar()
                        }
                      }}
                      disabled={submitting}
                      placeholder="Nombre del título"
                      aria-label="Nombre del título nuevo"
                      className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400
                        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors
                        ${errorNuevo ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    />
                    {errorNuevo && <p className="mt-1 text-xs text-red-600">{errorNuevo}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAgregar()}
                    disabled={submitting || nuevoNombre.trim() === ''}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300
                      text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0
                      focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                    Agregar
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Se agrega al final de la lista. El anunciador revela de abajo hacia arriba, así que
                  el último de la lista es el primero en proyectarse.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-gray-300 text-slate-700 font-medium rounded-lg text-sm
                    hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => void handleGuardar()}
                  disabled={submitting || titulos.length === 0}
                  className="flex-1 py-2 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400
                    text-white font-medium rounded-lg text-sm transition-colors
                    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  {submitting ? 'Guardando...' : 'Guardar nombres'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Hermano del modal, no anidado: dos <dialog> con showModal() se apilan
          en el top layer; anidar uno dentro del otro complica el backdrop. */}
      {porBorrar && (
        <ConfirmDialog
          titulo={`¿Quitar "${porBorrar.name}"?`}
          mensaje={
            asignados.has(porBorrar.id)
              ? 'Este título ya tiene una participante asignada por el director. Al quitarlo también se borra esa asignación, y si la edición está enviada al anunciador dejará de proyectarse.'
              : 'El título se elimina del catálogo de esta edición. Puedes volver a agregarlo después.'
          }
          textoConfirmar="Quitar título"
          textoCancelar="Cancelar"
          peligro
          onConfirmar={() => void handleBorrar(porBorrar)}
          onCancelar={() => setPorBorrar(null)}
        />
      )}
    </>
  )
}

export default TitulosModal
