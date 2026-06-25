import { useState } from 'react'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'
import { useCalificaciones } from '../../hooks/useCalificaciones'
import MatrizCalificaciones from '../../components/MatrizCalificaciones'
import LeaderboardPanel from '../../components/LeaderboardPanel'
import PuntosJueces from '../../components/PuntosJueces'

// Pestañas disponibles en la página
type Pestania = 'captura' | 'leaderboard' | 'jueces'

// Botón de pestaña del segmented control
function TabBoton({
  activa,
  onClick,
  children,
}: {
  activa: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        activa
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// Indicador de conexión realtime: punto pulsante cuando el canal está suscrito
function BadgeEnVivo({ conectado }: { conectado: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        conectado ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-slate-500',
      ].join(' ')}
    >
      <span className="relative flex w-2 h-2">
        {conectado && (
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        )}
        <span
          className={[
            'relative inline-flex w-2 h-2 rounded-full',
            conectado ? 'bg-emerald-500' : 'bg-gray-400',
          ].join(' ')}
        />
      </span>
      {conectado ? 'En vivo' : 'Conectando…'}
    </span>
  )
}

function CalificacionesPage() {
  // Siempre en el tope — nunca condicional
  const { edicion, loading: loadingEdicion } = useEdicionActiva()
  const {
    participantes,
    retos,
    getScore,
    leaderboard,
    loading,
    error,
    updateScore,
    realtimeConectado,
  } = useCalificaciones(edicion?.id)

  const [pestaniaActiva, setPestaniaActiva] = useState<Pestania>('captura')

  // Guard: esperando resolución de edición activa
  if (loadingEdicion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calificaciones</h1>
          <p className="text-slate-500 text-sm mt-1">
            {edicion.name} — {participantes.length} participantes · {retos.length} retos
          </p>
        </div>
        <BadgeEnVivo conectado={realtimeConectado} />
      </div>

      {/* Tabs — segmented control */}
      <div className="inline-flex gap-1 rounded-lg bg-gray-100 p-1 mb-6">
        <TabBoton
          activa={pestaniaActiva === 'captura'}
          onClick={() => setPestaniaActiva('captura')}
        >
          Captura
        </TabBoton>
        <TabBoton
          activa={pestaniaActiva === 'leaderboard'}
          onClick={() => setPestaniaActiva('leaderboard')}
        >
          Leaderboard
        </TabBoton>
        <TabBoton
          activa={pestaniaActiva === 'jueces'}
          onClick={() => setPestaniaActiva('jueces')}
        >
          Puntos jueces
        </TabBoton>
      </div>

      {/* Contenido: spinner mientras carga, error si falló, luego la pestaña activa */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-red-600 font-medium">Error al cargar las calificaciones</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      ) : pestaniaActiva === 'captura' ? (
        <MatrizCalificaciones
          participantes={participantes}
          retos={retos}
          getScore={getScore}
          onSaveScore={updateScore}
        />
      ) : pestaniaActiva === 'leaderboard' ? (
        <LeaderboardPanel rows={leaderboard} />
      ) : (
        <PuntosJueces edicionId={edicion.id} />
      )}
    </div>
  )
}

export default CalificacionesPage
