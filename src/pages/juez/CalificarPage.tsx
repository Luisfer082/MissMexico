import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useRondaJuez } from '../../hooks/useRondaJuez'
import type { FinalistaRonda } from '../../hooks/useRondaJuez'
import { useCalificacionJuez } from '../../hooks/useCalificacionJuez'
import SyncStatusBadge from '../../components/SyncStatusBadge'
import SelectorReto from '../../components/SelectorReto'
import type { AvanceReto } from '../../components/SelectorReto'
import { normalizar } from '../../utils/texto'

// ─── Celda de puntaje (1-10) ──────────────────────────────────────────────────
// Mantiene su propio texto mientras se edita; al confirmar valida 1-10 y
// reporta. Si queda vacío o inválido, revierte al valor previo (sin guardar).
interface CeldaProps {
  value: number | undefined
  disabled: boolean
  onCommit: (score: number) => void
}

function CeldaScoreJuez({ value, disabled, onCommit }: CeldaProps) {
  const [texto, setTexto] = useState(value?.toString() ?? '')
  const [valorSync, setValorSync] = useState(value)

  // Resincronizar el texto cuando cambia el valor externo (carga / sync remoto)
  // usando el patrón de ajuste-en-render de React (preferido sobre useEffect).
  if (value !== valorSync) {
    setValorSync(value)
    setTexto(value?.toString() ?? '')
  }

  const commit = () => {
    const limpio = texto.trim()
    if (limpio === '') {
      setTexto(value?.toString() ?? '')
      return
    }
    const n = Number(limpio)
    if (Number.isNaN(n) || n < 1 || n > 10) {
      setTexto(value?.toString() ?? '')
      return
    }
    // Máximo 2 decimales
    const redondeado = Math.round(n * 100) / 100
    onCommit(redondeado)
    setTexto(redondeado.toString())
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      min={1}
      max={10}
      step={0.1}
      value={texto}
      disabled={disabled}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      aria-label="Puntaje del 1 al 10"
      className="w-20 min-h-[44px] text-center text-lg font-semibold text-slate-900 border border-gray-300
        rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
        disabled:bg-gray-100 disabled:text-slate-400 disabled:cursor-not-allowed"
    />
  )
}

// ─── Fila de participante ─────────────────────────────────────────────────────
// La franja ámbar de la izquierda marca a quién le falta puntaje en el reto
// activo: en celular la lista no cabe de un vistazo y el juez no tenía forma de
// detectar que se saltó a alguien.
interface FilaProps {
  finalista: FinalistaRonda
  value: number | undefined
  disabled: boolean
  onCommit: (score: number) => void
}

function FilaFinalista({ finalista, value, disabled, onCommit }: FilaProps) {
  const pendiente = value === undefined
  return (
    <li
      className={`flex items-center justify-between gap-3 px-4 py-3 border-l-4 ${
        pendiente && !disabled ? 'border-amber-400 bg-amber-50/40' : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
          {finalista.sash_number}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 text-sm truncate">{finalista.full_name}</p>
          <p className="text-slate-400 text-xs truncate">{finalista.region}</p>
        </div>
      </div>
      <CeldaScoreJuez value={value} disabled={disabled} onCommit={onCommit} />
    </li>
  )
}

function CalificarPage() {
  const { ronda, retos, finalistas, scoresIniciales, loading, error } = useRondaJuez()
  const { getScore, setScore, estado, pendientes, rondaBloqueada } = useCalificacionJuez(
    ronda,
    scoresIniciales,
  )
  const [busqueda, setBusqueda] = useState('')
  const [busquedaAbierta, setBusquedaAbierta] = useState(false)
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [retoElegidoId, setRetoElegidoId] = useState<string | null>(null)

  // El encargado puede cambiar la edición activa en caliente (realtime): la
  // ronda del juez se reemplaza sola y con ella la etapa y las participantes.
  // Los puntajes pendientes NO se pierden: siguen atados a su ronda y se
  // sincronizan igual. Se avisa para que no parezca que se borró su captura.
  const rondaPrevia = useRef<string | null>(null)
  useEffect(() => {
    if (rondaPrevia.current && rondaPrevia.current !== (ronda?.id ?? null)) {
      toast('La edición activa cambió. Se cargó la ronda que corresponde.', {
        icon: '⚠️',
        duration: 6000,
      })
    }
    rondaPrevia.current = ronda?.id ?? null
  }, [ronda?.id])

  // Cerrada al cargar, o detectada como cerrada en caliente por el rechazo de la BD.
  const cerrada = ronda?.status === 'cerrada' || rondaBloqueada

  // El reto activo se DERIVA en vez de sincronizarse con un efecto: si la ronda
  // cambia en caliente, el id elegido deja de existir en los retos nuevos y cae
  // solo al primero, sin quedar en un estado intermedio con el reto viejo.
  const retoActivo = useMemo(
    () => retos.find((r) => r.id === retoElegidoId) ?? retos[0] ?? null,
    [retos, retoElegidoId],
  )

  // Avance por reto sobre TODAS las finalistas (no las filtradas): el contador
  // debe reflejar la ronda completa, no lo que quedó visible tras buscar.
  const avancePorReto = useMemo(() => {
    const mapa: Record<string, AvanceReto> = {}
    for (const reto of retos) {
      let calificadas = 0
      for (const f of finalistas) {
        if (getScore(f.id, reto.id) !== undefined) calificadas += 1
      }
      mapa[reto.id] = { calificadas, total: finalistas.length }
    }
    return mapa
  }, [retos, finalistas, getScore])

  const finalistasFiltradas = useMemo(() => {
    if (!retoActivo) return []
    const q = normalizar(busqueda.trim())
    return finalistas.filter((f) => {
      if (soloPendientes && getScore(f.id, retoActivo.id) !== undefined) return false
      if (q === '') return true
      return (
        normalizar(f.full_name).includes(q) ||
        normalizar(f.region).includes(q) ||
        f.sash_number.toString() === q
      )
    })
  }, [finalistas, busqueda, soloPendientes, retoActivo, getScore])

  const avanceActivo = retoActivo ? avancePorReto[retoActivo.id] : undefined
  const faltanEnActivo = avanceActivo ? avanceActivo.total - avanceActivo.calificadas : 0

  // Primer reto distinto del activo al que todavía le faltan puntajes: al
  // terminar uno, el juez no tiene que acordarse de cuál le queda pendiente.
  const siguientePendiente = useMemo(
    () =>
      retos.find((r) => {
        if (r.id === retoActivo?.id) return false
        const a = avancePorReto[r.id]
        return a !== undefined && a.calificadas < a.total
      }) ?? null,
    [retos, retoActivo, avancePorReto],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!ronda) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-700 font-medium">No tienes una ronda asignada</p>
        <p className="text-slate-400 text-sm mt-1">El encargado debe asignarte a una ronda para que puedas calificar.</p>
      </div>
    )
  }

  const hayContenido = retos.length > 0 && finalistas.length > 0

  return (
    <div>
      {/* Barra superior: etapa en curso + estado de sync (sticky bajo el header) */}
      <div className="sticky top-[68px] z-10 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">Calificación</h1>
            <p className="text-sm text-brand-700 font-semibold truncate">
              Etapa: {ronda.stage_name}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* En celular el buscador se despliega a demanda: el header + la barra
                se comían casi un tercio del viewport antes de la primera fila. */}
            <button
              type="button"
              onClick={() => setBusquedaAbierta((v) => !v)}
              aria-label={busquedaAbierta ? 'Cerrar búsqueda' : 'Buscar participante'}
              aria-expanded={busquedaAbierta}
              className="md:hidden inline-flex items-center justify-center w-11 min-h-[44px] rounded-lg
                text-slate-500 hover:text-slate-900 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            </button>
            <SyncStatusBadge estado={estado} pendientes={pendientes} />
          </div>
        </div>

        <div className={busquedaAbierta ? 'block' : 'hidden md:block'}>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, región o número…"
            aria-label="Buscar participante"
            className="mt-3 w-full min-h-[44px] px-4 text-sm text-slate-900 bg-white border border-gray-300
              rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              placeholder:text-slate-400"
          />
        </div>

        {/* Un reto a la vez: antes se apilaban todos y la lista de participantes
            se repetía entera por cada uno (18 finalistas × N retos de scroll). */}
        {hayContenido && retoActivo && (
          <div className="mt-3">
            <SelectorReto
              retos={retos}
              retoActivoId={retoActivo.id}
              avancePorReto={avancePorReto}
              onSeleccionar={(id) => {
                setRetoElegidoId(id)
                setSoloPendientes(false)
              }}
            />
          </div>
        )}
      </div>

      {cerrada && (
        <div className="mb-4 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-slate-600">
          Esta ronda está <strong>cerrada</strong>. Tus calificaciones quedaron congeladas y son de solo lectura.
        </div>
      )}

      {!hayContenido || !retoActivo ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-slate-500 text-sm">
            {retos.length === 0
              ? 'La ronda no tiene retos configurados.'
              : 'La etapa no tiene finalistas asignados.'}
          </p>
        </div>
      ) : (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <header className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 text-sm truncate">{retoActivo.name}</h2>
              <p className="text-xs text-slate-500">
                {faltanEnActivo === 0
                  ? `Completo · ${avanceActivo?.total ?? 0} calificadas`
                  : `Faltan ${faltanEnActivo} de ${avanceActivo?.total ?? 0}`}
              </p>
            </div>
            {!cerrada && faltanEnActivo > 0 && (
              <button
                type="button"
                onClick={() => setSoloPendientes((v) => !v)}
                aria-pressed={soloPendientes}
                className={`flex-shrink-0 px-3 min-h-[44px] rounded-lg border text-xs font-semibold transition-colors ${
                  soloPendientes
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-gray-300 text-slate-600 hover:bg-gray-50'
                }`}
              >
                {soloPendientes ? 'Ver todas' : `Solo pendientes (${faltanEnActivo})`}
              </button>
            )}
          </header>

          {finalistasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-slate-500 text-sm">
                {soloPendientes
                  ? 'No quedan participantes pendientes en este reto.'
                  : `Ninguna participante coincide con «${busqueda.trim()}».`}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {finalistasFiltradas.map((f) => (
                <FilaFinalista
                  key={f.id}
                  finalista={f}
                  value={getScore(f.id, retoActivo.id)}
                  disabled={cerrada}
                  onCommit={(score) => setScore(f.id, retoActivo.id, score)}
                />
              ))}
            </ul>
          )}

          {!cerrada && faltanEnActivo === 0 && siguientePendiente && (
            <div className="px-4 py-3 border-t border-gray-100 bg-emerald-50">
              <button
                type="button"
                onClick={() => {
                  setRetoElegidoId(siguientePendiente.id)
                  setSoloPendientes(false)
                }}
                className="w-full min-h-[44px] px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold
                  hover:bg-emerald-700 transition-colors"
              >
                Reto completo · Ir a {siguientePendiente.name}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default CalificarPage
