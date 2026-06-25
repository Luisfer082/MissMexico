import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import { useRondasJueces } from '../../hooks/useRondasJueces'
import { rondaJuezSchema } from '../../schemas/rondaJuez'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { RondaResumen } from '../../hooks/useRondasJueces'

function RondasJuecesPage() {
  const { edicion, loading: loadingEdicion } = useEdicionActiva()
  const { etapas, retos, jueces, rondas, loading, error, crearRonda, editarRonda, cerrarRonda } =
    useRondasJueces(edicion?.id)

  // Selección del formulario (nueva ronda o edición)
  const [etapaId, setEtapaId] = useState('')
  const [retosSel, setRetosSel] = useState<Set<string>>(new Set())
  const [juecesSel, setJuecesSel] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)

  // Ronda que está siendo editada (null = modo creación)
  const [rondaEditando, setRondaEditando] = useState<RondaResumen | null>(null)

  // Ronda pendiente de cerrar (null = sin confirmación abierta)
  const [rondaACerrar, setRondaACerrar] = useState<RondaResumen | null>(null)

  // Etapas que ya tienen ronda, excluyendo la ronda que se está editando para
  // que su propia etapa siga seleccionable durante la edición.
  const etapasConRonda = useMemo(
    () => new Set(rondas.filter((r) => r.id !== rondaEditando?.id).map((r) => r.stage_id)),
    [rondas, rondaEditando],
  )

  // Guarda de habilitación del botón (la validación formal la hace el schema).
  const puedeEnviar =
    etapaId !== '' && retosSel.size > 0 && juecesSel.size > 0 && !enviando

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
  }

  // Inicia el modo edición: pre-puebla el formulario con los datos actuales de la ronda.
  const handleIniciarEdicion = (ronda: RondaResumen) => {
    setRondaEditando(ronda)
    setEtapaId(ronda.stage_id)
    setRetosSel(new Set(ronda.challengeIds))
    setJuecesSel(new Set(ronda.judgeIds))
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
        error: (err: unknown) => (err instanceof Error ? err.message : 'Error al crear la ronda'),
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
          err instanceof Error ? err.message : 'Error al actualizar la ronda',
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
      error: (err: unknown) => (err instanceof Error ? err.message : 'Error al cerrar la ronda'),
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

            {/* Etapa */}
            <div className="mb-5">
              <label htmlFor="etapa" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Etapa
              </label>
              <select
                id="etapa"
                value={etapaId}
                onChange={(e) => setEtapaId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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

            {/* Jueces */}
            <fieldset className="mb-6">
              <legend className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Jueces participantes
              </legend>
              {jueces.length === 0 ? (
                <p className="text-sm text-slate-400">No hay usuarios con rol juez.</p>
              ) : (
                <div className="space-y-1.5">
                  {jueces.map((j) => (
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
                {rondas.map((r) => {
                  const cerrada = r.status === 'cerrada'
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
                            {r.numRetos} {r.numRetos === 1 ? 'reto' : 'retos'} · {r.numJueces} {r.numJueces === 1 ? 'juez' : 'jueces'}
                          </p>
                        </div>
                        {cerrada ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-slate-600">
                            Cerrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Abierta
                          </span>
                        )}
                      </div>
                      {/* Acciones: solo disponibles en rondas abiertas */}
                      {!cerrada && (
                        <div className="flex gap-2 mt-3">
                          {esLaQueSeEdita ? (
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
                          )}
                          <button
                            type="button"
                            onClick={() => setRondaACerrar(r)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200
                              hover:bg-red-50 rounded-md transition-colors"
                          >
                            Cerrar ronda
                          </button>
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
    </div>
  )
}

export default RondasJuecesPage
