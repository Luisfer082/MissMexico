// Pantalla Títulos del director (Fase 6, pasos 4-5): asignación drag-and-drop
// de los 8 títulos (6 títulos + 2 finalistas). El pool muestra a todas las
// participantes de la edición aún sin título; soltar sobre un slot asigna (o
// reemplaza). La aprobación exige confirmación doble y es IRREVERSIBLE
// (trigger prevent_mutation_when_approved en BD).

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
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import { useTitulos } from '../../hooks/useTitulos'
import type { ParticipanteTitulos } from '../../hooks/useTitulos'
import SlotTitulo from '../../components/SlotTitulo'
import ConfirmDialog from '../../components/ConfirmDialog'
import { normalizar } from '../../utils/texto'

// ─── Tarjeta arrastrable del pool ─────────────────────────────────────────────

interface TarjetaProps {
  participante: ParticipanteTitulos
  disabled: boolean
}

function TarjetaParticipante({ participante, disabled }: TarjetaProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: participante.id,
    disabled,
  })

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-gray-200
        ${disabled ? 'opacity-50' : 'cursor-grab active:cursor-grabbing touch-none'}
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
  const { edicion, loading: loadingEdicion, error: errorEdicion } = useEdicionActiva()
  const { titulos, asignaciones, participantes, loading, error, recargar, asignar, quitar, aprobar } =
    useTitulos(edicion?.id)
  const [busqueda, setBusqueda] = useState('')
  // Confirmación doble de la aprobación (regla 7): dos modales encadenados.
  const [confirmacion, setConfirmacion] = useState<'ninguna' | 'primera' | 'segunda'>('ninguna')

  // Distancia mínima para iniciar el drag: permite que los taps/clicks dentro
  // de la tarjeta no arranquen un arrastre accidental (también en touch).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const participantesPorId = useMemo(
    () => new Map(participantes.map((p) => [p.id, p])),
    [participantes],
  )

  const asignacionPorTitulo = useMemo(
    () => new Map(asignaciones.map((a) => [a.title_id, a])),
    [asignaciones],
  )

  // Pool: participantes sin título asignado, con filtro de búsqueda
  const pool = useMemo(() => {
    const asignadas = new Set(asignaciones.map((a) => a.participant_id))
    const libres = participantes.filter((p) => !asignadas.has(p.id))
    const q = normalizar(busqueda.trim())
    if (q === '') return libres
    return libres.filter(
      (p) =>
        normalizar(p.full_name).includes(q) ||
        normalizar(p.region).includes(q) ||
        p.sash_number.toString() === q,
    )
  }, [participantes, asignaciones, busqueda])

  const todasAprobadas = asignaciones.length > 0 && asignaciones.every((a) => a.approved)
  // El botón de aprobar solo se habilita con TODOS los títulos asignados (paso 5).
  const todosAsignados = titulos.length > 0 && asignaciones.length === titulos.length

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over) return
    void asignar(String(e.over.id), String(e.active.id))
  }

  const confirmarAprobacion = () => {
    setConfirmacion('ninguna')
    void aprobar()
  }

  // ─── Estados de carga / error / vacío ─────────────────────────────────────

  if (loadingEdicion || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (errorEdicion || error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-red-600 font-medium">Error al cargar los títulos</p>
        <p className="text-slate-500 text-sm">{errorEdicion ?? error}</p>
        <button
          onClick={recargar}
          className="px-4 py-1.5 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!edicion) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-700 font-medium">No hay edición activa</p>
        <p className="text-slate-400 text-sm mt-1">
          El encargado debe activar una edición para asignar títulos.
        </p>
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
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Títulos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {edicion.name} — {asignaciones.length} de {titulos.length} asignados
          </p>
        </div>
        {!todasAprobadas && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => setConfirmacion('primera')}
              disabled={!todosAsignados}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium
                hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2
                focus:ring-brand-500 focus:ring-offset-2
                disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Aprobar asignaciones
            </button>
            {!todosAsignados && (
              <p className="text-xs text-slate-400 mt-1.5">
                Asigna los {titulos.length} títulos para poder aprobar.
              </p>
            )}
          </div>
        )}
      </div>

      {todasAprobadas && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Las asignaciones están <strong>aprobadas</strong> y son definitivas.
        </div>
      )}

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
                  <TarjetaParticipante key={p.id} participante={p} disabled={todasAprobadas} />
                ))}
              </ul>
            )}
          </section>

          {/* Slots de títulos */}
          <section className="grid gap-3 sm:grid-cols-2">
            {titulos.map((t) => {
              const asignacion = asignacionPorTitulo.get(t.id) ?? null
              return (
                <SlotTitulo
                  key={t.id}
                  titulo={t}
                  participante={
                    asignacion ? (participantesPorId.get(asignacion.participant_id) ?? null) : null
                  }
                  aprobado={asignacion?.approved ?? false}
                  onQuitar={() => {
                    if (asignacion) void quitar(asignacion.id)
                  }}
                />
              )
            })}
          </section>
        </div>
      </DndContext>

      <p className="text-xs text-slate-400 mt-4">
        Arrastra una participante del pool a un título para asignarla. Soltar sobre un título
        ocupado reemplaza a la participante anterior. Cada participante puede tener un solo título.
      </p>

      {/* Confirmación doble (regla 7): la aprobación es irreversible en BD */}
      {confirmacion === 'primera' && (
        <ConfirmDialog
          titulo="¿Aprobar las asignaciones?"
          mensaje={`Se aprobarán los ${titulos.length} títulos de ${edicion.name}. Una vez aprobadas, las asignaciones quedan congeladas y NO se pueden modificar ni quitar.`}
          textoConfirmar="Continuar"
          onConfirmar={() => setConfirmacion('segunda')}
          onCancelar={() => setConfirmacion('ninguna')}
        />
      )}
      {confirmacion === 'segunda' && (
        <ConfirmDialog
          titulo="Esta acción es irreversible"
          mensaje="Confirmación final: al aprobar, la base de datos bloquea cualquier cambio a los títulos de forma permanente. No hay manera de deshacerlo. ¿Aprobar definitivamente?"
          textoConfirmar="Sí, aprobar definitivamente"
          textoCancelar="No, volver"
          peligro
          onConfirmar={confirmarAprobacion}
          onCancelar={() => setConfirmacion('ninguna')}
        />
      )}
    </div>
  )
}

export default TitulosPage
