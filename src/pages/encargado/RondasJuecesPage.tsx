import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import { useRondasJueces } from '../../hooks/useRondasJueces'
import { rondaJuezSchema } from '../../schemas/rondaJuez'
import { mensajeError } from '../../utils/mensaje-error'
import ConfirmDialog from '../../components/ConfirmDialog'
import SelectorParticipantesDrawer from '../../components/SelectorParticipantesDrawer'
import type { RondaResumen } from '../../hooks/useRondasJueces'

// Tintes para los avatares del resumen, rotados por índice.
const TINTES_AVATAR = [
  'bg-brand-100 text-brand-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
]

function RondasJuecesPage() {
  const { edicion, loading: loadingEdicion } = useEdicionActiva()
  const {
    etapas,
    retos,
    jueces,
    participantes,
    rondas,
    loading,
    error,
    crearRonda,
    editarRonda,
    cerrarRonda,
    eliminarRonda,
    guardarParticipantesEtapa,
  } = useRondasJueces(edicion?.id)

  // Selección del formulario (nueva ronda o edición)
  const [etapaId, setEtapaId] = useState('')
  const [retosSel, setRetosSel] = useState<Set<string>>(new Set())
  const [juecesSel, setJuecesSel] = useState<Set<string>>(new Set())
  const [participantesSel, setParticipantesSel] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)

  // Drawer de participantes. modo 'form' edita la selección del formulario;
  // 'card' edita directo los participantes de una ronda ya existente.
  const [drawerModo, setDrawerModo] = useState<'form' | 'card' | null>(null)
  const [rondaParaParticipantes, setRondaParaParticipantes] = useState<RondaResumen | null>(null)

  // Ronda que está siendo editada (null = modo creación)
  const [rondaEditando, setRondaEditando] = useState<RondaResumen | null>(null)

  // Ronda pendiente de cerrar (null = sin confirmación abierta)
  const [rondaACerrar, setRondaACerrar] = useState<RondaResumen | null>(null)

  // Ronda pendiente de eliminar (null = sin confirmación abierta)
  const [rondaAEliminar, setRondaAEliminar] = useState<RondaResumen | null>(null)

  // Etapas que ya tienen ronda, excluyendo la ronda que se está editando para
  // que su propia etapa siga seleccionable durante la edición.
  const etapasConRonda = useMemo(
    () => new Set(rondas.filter((r) => r.id !== rondaEditando?.id).map((r) => r.stage_id)),
    [rondas, rondaEditando],
  )

  // Orden de la lista: las rondas cuya ETAPA está cerrada bajan al fondo; las de
  // etapa abierta quedan arriba. Array.sort es estable, así que dentro de cada
  // grupo se respeta el orden original (created_at desc del hook).
  const rondasOrdenadas = useMemo(
    () =>
      [...rondas].sort((a, b) => {
        const aCerrada = a.stageStatus === 'cerrada' ? 1 : 0
        const bCerrada = b.stageStatus === 'cerrada' ? 1 : 0
        return aCerrada - bCerrada
      }),
    [rondas],
  )

  // Los jueces dados de baja no se ofrecen para rondas nuevas, pero si ya
  // estaban asignados a la ronda que se edita siguen visibles: si no, el
  // encargado no podría quitarlos y no entendería por qué falta uno.
  const juecesOfrecidos = useMemo(
    () => jueces.filter((j) => j.active || juecesSel.has(j.id)),
    [jueces, juecesSel],
  )

  // Guarda de habilitación del botón (la validación formal la hace el schema).
  const puedeEnviar =
    etapaId !== '' && retosSel.size > 0 && juecesSel.size > 0 && participantesSel.size >= 2 && !enviando

  const toggle = (set: Set<string>, id: string): Set<string> => {
    const siguiente = new Set(set)
    if (siguiente.has(id)) siguiente.delete(id)
    else siguiente.add(id)
    return siguiente
  }

  const resetForm = () => {
    setEtapaId('')
    setRetosSel(new Set())
    setJuecesSel(new Set())
    setParticipantesSel(new Set())
  }

  // Inicia el modo edición: pre-puebla el formulario con los datos actuales de la ronda.
  const handleIniciarEdicion = (ronda: RondaResumen) => {
    setRondaEditando(ronda)
    setEtapaId(ronda.stage_id)
    setRetosSel(new Set(ronda.challengeIds))
    setJuecesSel(new Set(ronda.judgeIds))
    setParticipantesSel(new Set(ronda.participantIds))
  }

  const handleCancelarEdicion = () => {
    setRondaEditando(null)
    resetForm()
  }

  const handleCrear = async () => {
    const candidato = {
      stage_id: etapaId,
      challenge_ids: [...retosSel],
      judge_ids: [...juecesSel],
      participant_ids: [...participantesSel],
    }
    const parsed = rondaJuezSchema.safeParse(candidato)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Revisa los datos de la ronda')
      return
    }

    setEnviando(true)
    try {
      await toast.promise(crearRonda(parsed.data), {
        loading: 'Creando ronda...',
        success: 'Ronda creada',
        error: (err: unknown) => mensajeError(err, 'Error al crear la ronda'),
      })
      resetForm()
    } catch {
      // toast.promise ya notificó; mantenemos la selección para reintentar
    } finally {
      setEnviando(false)
    }
  }

  const handleEditar = async () => {
    if (!rondaEditando) return
    const candidato = {
      stage_id: etapaId,
      challenge_ids: [...retosSel],
      judge_ids: [...juecesSel],
      participant_ids: [...participantesSel],
    }
    const parsed = rondaJuezSchema.safeParse(candidato)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Revisa los datos de la ronda')
      return
    }

    setEnviando(true)
    try {
      await toast.promise(editarRonda(rondaEditando.id, parsed.data), {
        loading: 'Guardando cambios...',
        success: 'Ronda actualizada',
        error: (err: unknown) =>
          mensajeError(err, 'Error al actualizar la ronda'),
      })
      setRondaEditando(null)
      resetForm()
    } catch {
      // toast.promise ya notificó; mantenemos la selección para reintentar
    } finally {
      setEnviando(false)
    }
  }

  const handleConfirmarCerrar = async () => {
    if (!rondaACerrar) return
    const ronda = rondaACerrar
    setRondaACerrar(null)
    await toast.promise(cerrarRonda(ronda.id), {
      loading: 'Cerrando ronda...',
      success: 'Ronda cerrada',
      error: (err: unknown) => mensajeError(err, 'Error al cerrar la ronda'),
    })
  }

  // Participantes seleccionados en el formulario, en orden de sash_number.
  const seleccionFormParticipantes = useMemo(
    () => participantes.filter((p) => participantesSel.has(p.id)),
    [participantes, participantesSel],
  )

  // Confirma la selección del drawer según el modo en que se abrió.
  const handleConfirmarDrawer = async (ids: string[]) => {
    if (drawerModo === 'form') {
      setParticipantesSel(new Set(ids))
      setDrawerModo(null)
      return
    }
    if (drawerModo === 'card' && rondaParaParticipantes) {
      const ronda = rondaParaParticipantes
      setDrawerModo(null)
      setRondaParaParticipantes(null)
      await toast.promise(guardarParticipantesEtapa(ronda.stage_id, ids), {
        loading: 'Guardando participantes...',
        success: 'Participantes actualizados',
        error: (err: unknown) =>
          mensajeError(err, 'Error al guardar los participantes'),
      })
    }
  }

  const handleCerrarDrawer = () => {
    setDrawerModo(null)
    setRondaParaParticipantes(null)
  }

  const handleConfirmarEliminar = async () => {
    if (!rondaAEliminar) return
    const ronda = rondaAEliminar
    setRondaAEliminar(null)
    // Si se está editando la ronda que se elimina, salir del modo edición.
    if (rondaEditando?.id === ronda.id) {
      setRondaEditando(null)
      resetForm()
    }
    await toast.promise(eliminarRonda(ronda.id), {
      loading: 'Eliminando ronda...',
      success: 'Ronda eliminada',
      error: (err: unknown) => mensajeError(err, 'Error al eliminar la ronda'),
    })
  }

  if (loadingEdicion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!edicion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-slate-700 font-medium">No hay edición activa</p>
        <p className="text-slate-400 text-sm mt-1">Se requiere una edición activa para configurar rondas de jueces.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rondas de jueces</h1>
        <p className="text-slate-500 text-sm mt-1">
          {edicion.name} — configura qué etapa, retos y jueces entran a cada ronda
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Columna: formulario (nueva ronda / editar ronda) ───────────── */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Título del panel cambia según el modo */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {rondaEditando
                  ? `Editar ronda — ${rondaEditando.stageName}`
                  : 'Nueva ronda'}
              </h2>
              {rondaEditando && (
                <button
                  type="button"
                  onClick={handleCancelarEdicion}
                  className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            {/* Etapa. Si la ronda en edición ya tiene calificaciones de jueces,
                no se permite moverla de etapa (los scores llevan el stage_id). */}
            <div className="mb-5">
              <label htmlFor="etapa" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Etapa
              </label>
              <select
                id="etapa"
                value={etapaId}
                onChange={(e) => setEtapaId(e.target.value)}
                disabled={rondaEditando?.tieneScores ?? false}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                  disabled:bg-gray-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona una etapa…</option>
                {etapas.map((et) => {
                  const ocupada = etapasConRonda.has(et.id)
                  return (
                    <option key={et.id} value={et.id} disabled={ocupada}>
                      {et.name}{ocupada ? ' (ya tiene ronda)' : ''}
                    </option>
                  )
                })}
              </select>
              {rondaEditando?.tieneScores && (
                <p className="mt-1.5 text-xs text-amber-600">
                  Esta ronda ya tiene calificaciones de jueces; no se puede cambiar de etapa.
                </p>
              )}
            </div>

            {/* Retos */}
            <fieldset className="mb-5">
              <legend className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Retos a calificar
              </legend>
              {retos.length === 0 ? (
                <p className="text-sm text-slate-400">No hay retos en esta edición.</p>
              ) : (
                <div className="space-y-1.5">
                  {retos.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200
                        hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={retosSel.has(r.id)}
                        onChange={() => setRetosSel((prev) => toggle(prev, r.id))}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">{r.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            {/* Participantes en la ronda */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Participantes en la ronda
                </span>
                {seleccionFormParticipantes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDrawerModo('form')}
                    className="text-xs text-brand-600 hover:text-brand-700 underline underline-offset-2 transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>

              {seleccionFormParticipantes.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setDrawerModo('form')}
                  className="w-full py-3 px-4 text-sm font-medium text-brand-600 border border-dashed border-brand-300
                    bg-brand-50/60 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  + Agregar participantes
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDrawerModo('form')}
                  className="w-full flex items-center gap-3 py-2.5 px-3 border border-gray-200 rounded-lg
                    hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="flex -space-x-2 flex-shrink-0">
                    {seleccionFormParticipantes.slice(0, 4).map((p, i) => (
                      <span
                        key={p.id}
                        className={`inline-flex items-center justify-center w-[30px] h-[30px] rounded-full
                          text-xs font-bold ring-2 ring-white ${TINTES_AVATAR[i % TINTES_AVATAR.length]}`}
                      >
                        {p.full_name.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">
                      {seleccionFormParticipantes.length} participantes
                    </span>
                    <span className="block text-xs text-slate-400 truncate">
                      {(() => {
                        const nombres = seleccionFormParticipantes.map((p) => p.full_name.split(' ')[0])
                        const visibles = nombres.slice(0, 3).join(', ')
                        return nombres.length > 3 ? `${visibles} +${nombres.length - 3}` : visibles
                      })()}
                    </span>
                  </span>
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Jueces */}
            <fieldset className="mb-6">
              <legend className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Jueces participantes
              </legend>
              {juecesOfrecidos.length === 0 ? (
                <p className="text-sm text-slate-400">No hay usuarios con rol juez activos.</p>
              ) : (
                <div className="space-y-1.5">
                  {juecesOfrecidos.map((j) => (
                    <label
                      key={j.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200
                        hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={juecesSel.has(j.id)}
                        onChange={() => setJuecesSel((prev) => toggle(prev, j.id))}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">{j.full_name ?? 'Juez sin nombre'}</span>
                      {!j.active && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-slate-500">
                          Inactivo
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <button
              type="button"
              onClick={() => void (rondaEditando ? handleEditar() : handleCrear())}
              disabled={!puedeEnviar}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium
                rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-600"
            >
              {rondaEditando ? 'Guardar cambios' : 'Crear ronda'}
            </button>
          </section>

          {/* ─── Columna: rondas existentes ───────────────────────────────── */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Rondas configuradas</h2>
            {rondas.length === 0 ? (
              <p className="text-sm text-slate-400">Aún no hay rondas. Crea la primera a la izquierda.</p>
            ) : (
              <ul className="space-y-3">
                {rondasOrdenadas.map((r) => {
                  const cerrada = r.status === 'cerrada'
                  const etapaCerrada = r.stageStatus === 'cerrada'
                  const esLaQueSeEdita = rondaEditando?.id === r.id
                  return (
                    <li
                      key={r.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        esLaQueSeEdita
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{r.stageName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {r.numRetos} {r.numRetos === 1 ? 'reto' : 'retos'} · {r.numJueces} {r.numJueces === 1 ? 'juez' : 'jueces'} · {r.numParticipantes} {r.numParticipantes === 1 ? 'participante' : 'participantes'}
                          </p>
                        </div>
                        {/* Dos badges: estado de la ronda y estado de la etapa dueña */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {cerrada ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-slate-600">
                              Ronda cerrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Ronda abierta
                            </span>
                          )}
                          {etapaCerrada ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
                              Etapa cerrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                              Etapa abierta
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Acciones. Editar/Cerrar dependen del estado de la RONDA;
                          Eliminar depende del estado de la ETAPA (regla 7: etapa
                          cerrada congela el snapshot y no se puede borrar). */}
                      {(!cerrada || !etapaCerrada) && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {!cerrada && !etapaCerrada && (
                            <button
                              type="button"
                              onClick={() => {
                                setRondaParaParticipantes(r)
                                setDrawerModo('card')
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700
                                rounded-md transition-colors"
                            >
                              + Participantes
                            </button>
                          )}
                          {!cerrada &&
                            (esLaQueSeEdita ? (
                              <button
                                type="button"
                                onClick={handleCancelarEdicion}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-gray-300
                                  hover:bg-gray-50 rounded-md transition-colors"
                              >
                                Cancelar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleIniciarEdicion(r)}
                                className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200
                                  hover:bg-brand-50 rounded-md transition-colors"
                              >
                                Editar ronda
                              </button>
                            ))}
                          {!cerrada && (
                            <button
                              type="button"
                              onClick={() => setRondaACerrar(r)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200
                                hover:bg-red-50 rounded-md transition-colors"
                            >
                              Cerrar ronda
                            </button>
                          )}
                          {!etapaCerrada && (
                            <button
                              type="button"
                              onClick={() => setRondaAEliminar(r)}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300
                                hover:bg-red-100 rounded-md transition-colors"
                            >
                              Eliminar ronda
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Confirmación de cierre de ronda */}
      {rondaACerrar && (
        <ConfirmDialog
          titulo="Cerrar ronda de jueces"
          mensaje={`¿Cerrar la ronda de "${rondaACerrar.stageName}"? Las calificaciones de los jueces quedarán congeladas mientras la ronda permanezca cerrada.`}
          textoConfirmar="Sí, cerrar ronda"
          peligro
          onConfirmar={() => void handleConfirmarCerrar()}
          onCancelar={() => setRondaACerrar(null)}
        />
      )}

      {/* Confirmación de eliminación de ronda */}
      {rondaAEliminar && (
        <ConfirmDialog
          titulo="Eliminar ronda de jueces"
          mensaje={`¿Eliminar la ronda de "${rondaAEliminar.stageName}"? Se borrarán su configuración de retos y jueces. Esta acción no se puede deshacer.`}
          textoConfirmar="Sí, eliminar ronda"
          peligro
          onConfirmar={() => void handleConfirmarEliminar()}
          onCancelar={() => setRondaAEliminar(null)}
        />
      )}

      {/* Drawer de selección de participantes (formulario o tarjeta) */}
      {drawerModo && (
        <SelectorParticipantesDrawer
          participantes={participantes}
          seleccionInicial={
            drawerModo === 'card'
              ? rondaParaParticipantes?.participantIds ?? []
              : [...participantesSel]
          }
          onConfirmar={(ids) => void handleConfirmarDrawer(ids)}
          onCerrar={handleCerrarDrawer}
        />
      )}
    </div>
  )
}

export default RondasJuecesPage
