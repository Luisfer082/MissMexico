import { useEffect, useMemo, useRef, useState } from 'react'
import type { ParticipanteOpcion } from '../hooks/useRondasJueces'

interface Props {
  participantes: ParticipanteOpcion[]
  // Selección ya confirmada; precarga el drawer al abrir para editar.
  seleccionInicial: string[]
  onConfirmar: (ids: string[]) => void
  onCerrar: () => void
}

// Tintes para el avatar (inicial sobre color), rotados por índice.
const TINTES = [
  'bg-brand-100 text-brand-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
]

const num2 = (n: number) => `#${String(n).padStart(2, '0')}`

// Hoja lateral para elegir qué participantes compiten en la ronda. La selección
// es tentativa hasta presionar "Agregar"; cerrar/cancelar descarta cambios.
// Mínimo 2 participantes por ronda (regla de producto).
function SelectorParticipantesDrawer({ participantes, seleccionInicial, onConfirmar, onCerrar }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(seleccionInicial))
  const [busqueda, setBusqueda] = useState('')
  const [region, setRegion] = useState<string>('__todas__')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Regiones únicas para los chips de filtro.
  const regiones = useMemo(() => {
    const set = new Set(participantes.map((p) => p.region))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [participantes])

  // Subconjunto visible según búsqueda + región.
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return participantes.filter((p) => {
      if (region !== '__todas__' && p.region !== region) return false
      if (q === '') return true
      return (
        p.full_name.toLowerCase().includes(q) ||
        String(p.sash_number).includes(q.replace('#', ''))
      )
    })
  }, [participantes, busqueda, region])

  const todosFiltradosSel =
    filtrados.length > 0 && filtrados.every((p) => seleccion.has(p.id))

  const toggleUno = (id: string) => {
    setSeleccion((prev) => {
      const sig = new Set(prev)
      if (sig.has(id)) sig.delete(id)
      else sig.add(id)
      return sig
    })
  }

  // Selecciona/deselecciona solo los visibles según el filtro actual.
  const toggleTodosFiltrados = () => {
    setSeleccion((prev) => {
      const sig = new Set(prev)
      if (todosFiltradosSel) filtrados.forEach((p) => sig.delete(p.id))
      else filtrados.forEach((p) => sig.add(p.id))
      return sig
    })
  }

  const handleClickFondo = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onCerrar()
  }

  const total = seleccion.size
  const suficientes = total >= 2

  return (
    <dialog
      ref={dialogRef}
      onClose={onCerrar}
      onClick={handleClickFondo}
      className="m-0 ml-auto h-full max-h-screen w-[460px] max-w-[92vw] p-0 bg-white shadow-2xl
        backdrop:bg-[rgba(15,22,40,0.42)]"
    >
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Agregar participantes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecciona quiénes compiten en esta ronda
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Buscador */}
        <div className="px-5 pt-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o número…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        {/* Chips de región */}
        {regiones.length > 0 && (
          <div className="px-5 pt-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <ChipRegion activo={region === '__todas__'} onClick={() => setRegion('__todas__')}>
                Todas
              </ChipRegion>
              {regiones.map((r) => (
                <ChipRegion key={r} activo={region === r} onClick={() => setRegion(r)}>
                  {r}
                </ChipRegion>
              ))}
            </div>
          </div>
        )}

        {/* Barra seleccionar todos */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <CheckboxVisual marcado={todosFiltradosSel} />
            <span className="text-sm text-slate-700">
              Seleccionar todos ({filtrados.length})
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={todosFiltradosSel}
              onChange={toggleTodosFiltrados}
            />
          </label>
          <span className="text-xs font-semibold text-brand-600">{total} seleccionados</span>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {filtrados.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">Sin resultados</p>
          ) : (
            <ul>
              {filtrados.map((p, i) => {
                const marcado = seleccion.has(p.id)
                return (
                  <li key={p.id}>
                    <label
                      className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                        marcado ? 'bg-brand-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <CheckboxVisual marcado={marcado} />
                      <span
                        className={`inline-flex items-center justify-center w-[38px] h-[38px] rounded-full text-sm font-bold flex-shrink-0 ${
                          TINTES[i % TINTES.length]
                        }`}
                      >
                        {p.full_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 truncate">{p.full_name}</span>
                        <span className="block text-xs text-slate-400 truncate">
                          {num2(p.sash_number)} · {p.region}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={marcado}
                        onChange={() => toggleUno(p.id)}
                      />
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3">
          {!suficientes && (
            <p className="text-xs text-amber-600 mb-2">Mínimo 2 participantes por ronda.</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 border border-gray-300
                hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirmar([...seleccion])}
              disabled={!suficientes}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700
                rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-600"
            >
              Agregar ({total})
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

interface ChipProps {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}

function ChipRegion({ activo, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
        activo
          ? 'bg-brand-50 border-brand-500 text-brand-700'
          : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

// Caja visual del checkbox (el input real va sr-only en el label que la envuelve).
function CheckboxVisual({ marcado }: { marcado: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center w-[19px] h-[19px] rounded-[5px] border flex-shrink-0 transition-colors ${
        marcado ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300'
      }`}
    >
      {marcado && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  )
}

export default SelectorParticipantesDrawer
