import { useState } from 'react'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import { useCalificaciones } from '../../hooks/useCalificaciones'
import MatrizCalificaciones from '../../components/MatrizCalificaciones'
import LeaderboardPanel from '../../components/LeaderboardPanel'

// Pestañas disponibles en la página
type Pestania = 'captura' | 'leaderboard'

function CalificacionesPage() {
  // Siempre en el tope — nunca condicional
  const { edicion, loading: loadingEdicion } = useEdicionActiva()
  const { participantes, retos, getScore, leaderboard, loading, updateScore } =
    useCalificaciones(edicion?.id)

  const [pestaniaActiva, setPestaniaActiva] = useState<Pestania>('captura')

  // Guard: esperando resolución de edición activa
  if (loadingEdicion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Guard: no existe edición activa
  if (!edicion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-slate-700 font-medium">No hay edición activa</p>
        <p className="text-slate-400 text-sm mt-1">
          Se requiere una edición activa para capturar calificaciones.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Calificaciones</h1>
        <p className="text-slate-500 text-sm mt-1">
          {edicion.name} — {participantes.length} participantes · {retos.length} retos
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0">
          <button
            onClick={() => setPestaniaActiva('captura')}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              pestaniaActiva === 'captura'
                ? 'border-b-2 -mb-px border-rose-600 text-rose-600'
                : 'border-b-2 -mb-px border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            Captura
          </button>
          <button
            onClick={() => setPestaniaActiva('leaderboard')}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              pestaniaActiva === 'leaderboard'
                ? 'border-b-2 -mb-px border-rose-600 text-rose-600'
                : 'border-b-2 -mb-px border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            Leaderboard
          </button>
        </nav>
      </div>

      {/* Contenido: spinner mientras carga el hook, luego la pestaña activa */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pestaniaActiva === 'captura' ? (
        <MatrizCalificaciones
          participantes={participantes}
          retos={retos}
          getScore={getScore}
          onSaveScore={updateScore}
        />
      ) : (
        <LeaderboardPanel rows={leaderboard} />
      )}
    </div>
  )
}

export default CalificacionesPage
