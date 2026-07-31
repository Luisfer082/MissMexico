// Pantalla Títulos del director (§5.5, paso 3 — rework de Fase 6).
//
// Asignación drag-and-drop de los 8 slots (6 títulos + 2 finalistas) sobre el
// BORRADOR del directorSlice: arrastrar y quitar no van a la BD, se persisten
// con Guardar (barra del layout). Antes cada movimiento era un round-trip y la
// selección se perdía al cambiar de pestaña.
//
// El pool muestra a todas las participantes de la edición aún sin título
// (pendiente en §5.1: decidir si se restringe a las finalistas de la última etapa).

import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '../../stores/useAppStore'
import type { ParticipanteDirector } from '../../stores/slices/directorSlice'
import SlotTitulo from '../../components/SlotTitulo'
import { normalizar } from '../../utils/texto'

// ─── Tarjeta arrastrable del pool ─────────────────────────────────────────────

interface TarjetaProps {
  participante: ParticipanteDirector
}

function TarjetaParticipante({ participante }: TarjetaProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: participante.id,
  })

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-gray-200
        cursor-grab active:cursor-grabbing touch-none
        ${isDragging ? 'z-10 relative shadow-lg ring-2 ring-brand-400' : ''}`}
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
        {participante.sash_number}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-slate-900 text-sm truncate">{participante.full_name}</p>
        <p className="text-slate-400 text-xs truncate">{participante.region}</p>
      </div>
    </li>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

function TitulosPage() {
  const loading = useAppStore((s) => s.directorLoading)
  const error = useAppStore((s) => s.directorError)
  const titulos = useAppStore((s) => s.directorTitulos)
  const participantes = useAppStore((s) => s.directorParticipantes)
  const asignaciones = useAppStore((s) => s.directorAsignaciones)
  const asignar = useAppStore((s) => s.asignarTitulo)
  const quitar = useAppStore((s) => s.quitarTitulo)
  const recargar = useAppStore((s) => s.recargarDirector)

  const [busqueda, setBusqueda] = useState('')

  // Distancia mínima para iniciar el drag: evita que un tap dentro de la
  // tarjeta arranque un arrastre accidental (también en touch).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const porId = useMemo(() => new Map(participantes.map((p) => [p.id, p])), [participantes])

  const ocupadas = useMemo(
    () => new Set(Object.values(asignaciones).filter((id): id is string => id !== null)),
    [asignaciones],
  )

  const pool = useMemo(() => {
    const libres = participantes.filter((p) => !ocupadas.has(p.id))
    const q = normalizar(busqueda.trim())
    if (q === '') return libres
    return libres.filter(
      (p) =>
        normalizar(p.full_name).includes(q) ||
        normalizar(p.region).includes(q) ||
        p.sash_number.toString() === q,
    )
  }, [participantes, ocupadas, busqueda])

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over) return
    asignar(String(e.over.id), String(e.active.id))
  }

  // ─── Estados de carga / error / vacío ─────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-red-600 font-medium">Error al cargar los títulos</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <button
          onClick={() => void recargar()}
          className="px-4 py-1.5 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (titulos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-700 font-medium">Esta edición no tiene títulos</p>
        <p className="text-slate-400 text-sm mt-1">
          El encargado debe generarlos en Ediciones → Títulos.
        </p>
      </div>
    )
  }

  // ─── Contenido ────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Títulos</h1>
        <p className="text-slate-500 text-sm mt-1">
          {ocupadas.size} de {titulos.length} asignados
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-6 lg:grid-cols-[minmax(16rem,1fr)_1.5fr] items-start">
          {/* Pool de participantes */}
          <section className="bg-gray-100 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 text-sm mb-3">
              Participantes sin título ({pool.length})
            </h2>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, región o número…"
              aria-label="Buscar participante"
              className="mb-3 w-full min-h-[40px] px-3 text-sm text-slate-900 bg-white border border-gray-300
                rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                placeholder:text-slate-400"
            />
            {pool.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">
                {busqueda.trim() !== ''
                  ? 'Ninguna participante coincide con la búsqueda.'
                  : 'Todas las participantes tienen título asignado.'}
              </p>
            ) : (
              <ul className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                {pool.map((p) => (
                  <TarjetaParticipante key={p.id} participante={p} />
                ))}
              </ul>
            )}
          </section>

          {/* Slots de títulos */}
          <section className="grid gap-3 sm:grid-cols-2">
            {titulos.map((t) => {
              const participanteId = asignaciones[t.id] ?? null
              return (
                <SlotTitulo
                  key={t.id}
                  titulo={t}
                  participante={participanteId ? (porId.get(participanteId) ?? null) : null}
                  onQuitar={() => quitar(t.id)}
                />
              )
            })}
          </section>
        </div>
      </DndContext>

      <p className="text-xs text-slate-400 mt-4">
        Arrastra una participante del pool a un título para asignarla. Soltar sobre un título
        ocupado reemplaza a la participante anterior. Cada participante puede tener un solo título.
        Los cambios no se guardan hasta que pulses Guardar.
      </p>
    </div>
  )
}

export default TitulosPage
