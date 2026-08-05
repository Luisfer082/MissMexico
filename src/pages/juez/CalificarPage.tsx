import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useRondaJuez } from '../../hooks/useRondaJuez'
import { useCalificacionJuez } from '../../hooks/useCalificacionJuez'
import SyncStatusBadge from '../../components/SyncStatusBadge'
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

function CalificarPage() {
  const { ronda, retos, finalistas, scoresIniciales, loading, error } = useRondaJuez()
  const { getScore, setScore, estado, pendientes, rondaBloqueada } = useCalificacionJuez(
    ronda,
    scoresIniciales,
  )
  const [busqueda, setBusqueda] = useState('')

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

  const finalistasFiltradas = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (q === '') return finalistas
    return finalistas.filter(
      (f) =>
        normalizar(f.full_name).includes(q) ||
        normalizar(f.region).includes(q) ||
        f.sash_number.toString() === q,
    )
  }, [finalistas, busqueda])

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

  return (
    <div>
      {/* Barra superior: etapa en curso + estado de sync (sticky bajo el header) */}
      <div className="sticky top-[60px] z-10 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">Calificación</h1>
            <p className="text-sm text-brand-700 font-semibold truncate">
              Etapa: {ronda.stage_name}
            </p>
          </div>
          <SyncStatusBadge estado={estado} pendientes={pendientes} />
        </div>
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

      {cerrada && (
        <div className="mb-4 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-slate-600">
          Esta ronda está <strong>cerrada</strong>. Tus calificaciones quedaron congeladas y son de solo lectura.
        </div>
      )}

      {retos.length === 0 || finalistas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-slate-500 text-sm">
            {retos.length === 0
              ? 'La ronda no tiene retos configurados.'
              : 'La etapa no tiene finalistas asignados.'}
          </p>
        </div>
      ) : finalistasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-slate-500 text-sm">
            Ninguna participante coincide con «{busqueda.trim()}».
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {retos.map((reto) => (
            <section key={reto.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <header className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-slate-900 text-sm">{reto.name}</h2>
              </header>
              <ul className="divide-y divide-gray-50">
                {finalistasFiltradas.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
                        {f.sash_number}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{f.full_name}</p>
                        <p className="text-slate-400 text-xs truncate">{f.region}</p>
                      </div>
                    </div>
                    <CeldaScoreJuez
                      value={getScore(f.id, reto.id)}
                      disabled={cerrada}
                      onCommit={(score) => setScore(f.id, reto.id, score)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default CalificarPage
