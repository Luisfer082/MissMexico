// Pantalla Títulos del director (§5.5, paso 3 — rework de Fase 6).
//
// Asignación drag-and-drop de los 7 slots (5 títulos + 2 finalistas) sobre el
// BORRADOR del directorSlice: arrastrar y quitar no van a la BD, se persisten
// con Guardar (barra del layout). Antes cada movimiento era un round-trip y la
// selección se perdía al cambiar de pestaña.
//
// El pool muestra a todas las participantes de la edición aún sin título
// (pendiente en §5.1: decidir si se restringe a las finalistas de la última etapa).

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useAppStore } from '../../stores/useAppStore'
import type { ParticipanteDirector } from '../../stores/slices/directorSlice'
import SlotTitulo from '../../components/SlotTitulo'
import { normalizar } from '../../utils/texto'
import { mensajeError } from '../../utils/mensaje-error'

// ─── Tarjeta arrastrable del pool ─────────────────────────────────────────────

interface TarjetaProps {
  participante: ParticipanteDirector
}

/** Clases compartidas por la tarjeta real y la del overlay, para que se vean igual. */
const CLASES_TARJETA =
  'flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-gray-200'

// Contenido visual, sin nada de drag: se reutiliza en el DragOverlay.
function ContenidoTarjeta({ participante }: TarjetaProps) {
  return (
    <>
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
        {participante.sash_number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900 text-sm truncate">{participante.full_name}</p>
        <p className="text-slate-400 text-xs truncate">{participante.region}</p>
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

// Los listeners van en TODA la tarjeta (Luis, 2026-08-21). Lo que evita que el
// gesto le robe el scroll al pool es el `delay` del TouchSensor: en táctil hay
// que mantener presionado para arrastrar.
function TarjetaParticipante({ participante }: TarjetaProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: participante.id,
  })

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // Sin transform: la tarjeta se queda quieta y lo que se mueve es la copia
      // del DragOverlay. Antes se movía aquí dentro y, como el pool tiene
      // overflow-y-auto, estiraba el contenedor y quedaba cortada.
      className={`${CLASES_TARJETA} cursor-grab active:cursor-grabbing touch-manipulation
        select-none ${isDragging ? 'opacity-40' : ''}`}
    >
      <ContenidoTarjeta participante={participante} />
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
  const publicado = useAppStore((s) => s.directorPublicado)
  const publicar = useAppStore((s) => s.publicarDirector)
  const hayCambios = useAppStore((s) => s.hayCambiosSinGuardar)

  const [busqueda, setBusqueda] = useState('')

  // Distancia mínima para iniciar el drag: evita que un tap dentro de la
  // tarjeta arranque un arrastre accidental (también en touch).
  // Ratón y dedo necesitan gestos distintos: con el ratón basta desplazar un
  // poco; en táctil hay que MANTENER PRESIONADO ~110ms para no robarle el
  // gesto al scroll del pool.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 110, tolerance: 8 } }),
  )

  // Participante que se está arrastrando, para pintarla en el DragOverlay.
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)

  const porId = useMemo(() => new Map(participantes.map((p) => [p.id, p])), [participantes])

  const arrastrando = arrastrandoId ? porId.get(arrastrandoId) : undefined

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

  // Envío al anunciador: REVERSIBLE, sin confirmación doble. Lo irreversible en
  // este sistema es solo el cierre de etapa (regla 7); aquí se puede retirar,
  // corregir y volver a enviar. Se exige tener todo asignado y guardado para no
  // proyectar un borrador a medias.
  const todosAsignados = titulos.length > 0 && ocupadas.size === titulos.length
  const puedeEnviar = todosAsignados && !hayCambios

  const handlePublicar = (valor: boolean) => {
    void toast.promise(publicar(valor), {
      loading: valor ? 'Enviando al anunciador...' : 'Retirando...',
      success: valor
        ? 'Enviado. El anunciador ya puede proyectar.'
        : 'Retirado. El anunciador dejó de ver los títulos.',
      error: (err: unknown) => mensajeError(err, 'Error al actualizar el envío'),
    })
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
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Títulos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {ocupadas.size} de {titulos.length} asignados
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {publicado ? (
            <button
              type="button"
              onClick={() => handlePublicar(false)}
              className="px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900
                text-sm font-medium hover:bg-amber-100 transition-colors focus:outline-none
                focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            >
              Retirar del anunciador
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePublicar(true)}
              disabled={!puedeEnviar}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium
                hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2
                focus:ring-brand-500 focus:ring-offset-2
                disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Enviar al anunciador
            </button>
          )}
          {!publicado && !todosAsignados && (
            <p className="text-xs text-slate-400 mt-1.5">
              Asigna los {titulos.length} títulos para poder enviar.
            </p>
          )}
          {!publicado && todosAsignados && hayCambios && (
            <p className="text-xs text-slate-400 mt-1.5">Guarda los cambios para poder enviar.</p>
          )}
        </div>
      </div>

      {publicado && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Los títulos están <strong>enviados al anunciador</strong>, que ya puede proyectarlos.
          Puedes retirarlos en cualquier momento: nada aquí es irreversible.
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setArrastrandoId(String(e.active.id))}
        onDragEnd={(e) => {
          setArrastrandoId(null)
          handleDragEnd(e)
        }}
        onDragCancel={() => setArrastrandoId(null)}
      >
        <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(13rem,1fr)_1.5fr] items-start">
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
              <ul className="space-y-2 max-h-[24rem] lg:max-h-[32rem] overflow-y-auto pr-1">
                {pool.map((p) => (
                  <TarjetaParticipante key={p.id} participante={p} />
                ))}
              </ul>
            )}
          </section>

          {/* Slots de títulos */}
          <section className="grid gap-3 lg:grid-cols-2">
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

        {/* La copia que sigue al dedo, en un portal por encima de todo: no la
            recorta el overflow del pool ni estira su contenedor. */}
        <DragOverlay>
          {arrastrando ? (
            <div className={`${CLASES_TARJETA} shadow-2xl ring-2 ring-brand-400 cursor-grabbing`}>
              <ContenidoTarjeta participante={arrastrando} />
            </div>
          ) : null}
        </DragOverlay>
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
