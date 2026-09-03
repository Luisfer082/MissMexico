import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../stores/useAppStore'
import type { TituloAnuncio } from '../../stores/slices/anuncioSlice'

// Pantalla de orden del Anunciador (§5.8). Es "la parte de atrás": aquí se
// define en qué orden se van a revelar las ganadoras, arrastrando. El orden se
// persiste en announcement_order, así que sobrevive a una recarga.
//
// El orden por defecto (sin nada guardado) es del título menos importante al
// más importante, para generar suspenso.

/** Clases compartidas por la fila real y la del overlay, para que se vean igual. */
const CLASES_FILA =
  'flex items-center gap-3 px-3 py-3 bg-white rounded-lg border border-gray-200'

interface ContenidoProps {
  titulo: TituloAnuncio
  posicion: number
}

// Contenido visual de la fila, sin nada de drag. Se comparte entre la fila real
// y la copia que se pinta en el DragOverlay mientras se arrastra.
function ContenidoFila({ titulo, posicion }: ContenidoProps) {
  return (
    <>
      <span className="w-6 text-right text-sm font-bold text-slate-400 flex-shrink-0 tabular-nums">
        {posicion}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900 text-sm truncate">{titulo.titulo}</p>
        <p className="text-slate-400 text-xs truncate">{titulo.participante}</p>
      </div>
      <svg
        className="w-5 h-5 text-slate-300 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
      </svg>
    </>
  )
}

interface FilaProps extends ContenidoProps {
  bloqueada: boolean
}

// Los listeners van en TODA la fila y lo que evita que el gesto le robe el
// scroll es el TouchSensor con `delay` del DndContext, igual que en el ranking
// del director (Luis, 2026-08-21).
function FilaOrden({ titulo, posicion, bloqueada }: FilaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: titulo.titleId,
    disabled: bloqueada,
  })

  return (
    <li
      ref={setNodeRef}
      {...(bloqueada ? {} : listeners)}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${CLASES_FILA} touch-manipulation select-none ${
        bloqueada ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <ContenidoFila titulo={titulo} posicion={posicion} />
    </li>
  )
}

function OrdenPage() {
  const { titulos, reveladosCount, reordenar, guardarOrden, sinGuardar, guardando, loading, error } =
    useAppStore(
      useShallow((s) => ({
        titulos: s.anuncioTitulos,
        reveladosCount: s.anuncioReveladosCount,
        reordenar: s.reordenarAnuncio,
        guardarOrden: s.guardarOrdenAnuncio,
        sinGuardar: s.anuncioOrdenSinGuardar,
        guardando: s.anuncioGuardando,
        loading: s.anuncioLoading,
        error: s.anuncioError,
      })),
    )

  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)

  // Reordenar con el show ya empezado cambiaría EN VIVO qué título está
  // proyectado (lo que se ve es titulos[revelados - 1]), así que se bloquea
  // hasta reiniciar. Es una pantalla de preparación, no de operación.
  const enCurso = reveladosCount > 0

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 110, tolerance: 8 } }),
  )

  const handleDragStart = (e: DragStartEvent) => setArrastrandoId(String(e.active.id))

  const handleDragEnd = (e: DragEndEvent) => {
    setArrastrandoId(null)
    if (!e.over || e.active.id === e.over.id) return
    const desde = titulos.findIndex((t) => t.titleId === String(e.active.id))
    const hasta = titulos.findIndex((t) => t.titleId === String(e.over?.id))
    if (desde === -1 || hasta === -1) return
    reordenar(desde, hasta)
  }

  const handleGuardar = () => {
    void toast.promise(guardarOrden(), {
      loading: 'Guardando orden...',
      success: 'Orden guardado',
      error: (err: Error) => err.message,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <p className="text-red-600 font-medium">Error al cargar los títulos</p>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    )
  }

  if (titulos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-700 font-medium">Todavía no hay títulos que ordenar</p>
        <p className="text-slate-400 text-sm mt-1">
          El director aún no ha enviado los resultados.
        </p>
      </div>
    )
  }

  const arrastrando = arrastrandoId
    ? titulos.find((t) => t.titleId === arrastrandoId)
    : undefined
  const posicionArrastrada = arrastrando ? titulos.indexOf(arrastrando) + 1 : 0

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Orden de revelación</h1>
        <p className="text-sm text-slate-500 mt-1">
          Arrastra para definir en qué orden se revelan. El primero de la lista es el primero que
          se proyecta.
        </p>
      </div>

      {enCurso && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La ceremonia ya empezó ({reveladosCount} de {titulos.length} revelados). El orden está
          bloqueado para no cambiar en vivo lo que se está proyectando. Reinicia el show desde la
          pantalla de proyección para poder reordenar.
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext
          items={titulos.map((t) => t.titleId)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {titulos.map((t, i) => (
              <FilaOrden key={t.titleId} titulo={t} posicion={i + 1} bloqueada={enCurso} />
            ))}
          </ul>
        </SortableContext>

        {/* La copia que sigue al dedo: sin ella la fila se transforma dentro del
            flujo del documento y queda tapada por sus hermanas. */}
        <DragOverlay>
          {arrastrando ? (
            <div className={`${CLASES_FILA} shadow-lg`}>
              <ContenidoFila titulo={arrastrando} posicion={posicionArrastrada} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-sm text-slate-500">
          {sinGuardar ? 'Tienes cambios sin guardar.' : 'Todo guardado.'}
        </p>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={!sinGuardar || guardando}
          className="w-full sm:w-auto min-h-[44px] px-5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300
            disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
        >
          {guardando ? 'Guardando...' : 'Guardar orden'}
        </button>
      </div>
    </div>
  )
}

export default OrdenPage
