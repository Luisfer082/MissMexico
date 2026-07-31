import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../stores/useAppStore'
import ConfirmDialog from '../../components/ConfirmDialog'

// Pantalla de Control del Anunciador. El operador revela los títulos uno por
// uno con un botón grande. La lista muestra el estado de cada título (revelado
// / pendiente). "Reiniciar" vuelve el show a cero, con confirmación (es una
// acción visible en vivo).
function ControlPage() {
  const { titulos, reveladosCount, revelarSiguiente, reiniciar, loading, error, publicado } =
    useAppStore(
      useShallow((s) => ({
        titulos: s.anuncioTitulos,
        reveladosCount: s.anuncioReveladosCount,
        revelarSiguiente: s.revelarSiguiente,
        reiniciar: s.reiniciarAnuncio,
        loading: s.anuncioLoading,
        error: s.anuncioError,
        publicado: s.anuncioPublicado,
      })),
    )

  const [confirmarReinicio, setConfirmarReinicio] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <p className="text-red-600 font-medium">Error al cargar los títulos</p>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    )
  }

  // Sin títulos: o el director todavía no los envió, o los retiró para corregir.
  if (titulos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-700 font-medium">Todavía no hay títulos que proyectar</p>
        <p className="text-slate-400 text-sm mt-1">
          {publicado
            ? 'La edición está enviada pero no tiene títulos asignados.'
            : 'El director aún no ha enviado los resultados.'}
        </p>
      </div>
    )
  }

  const total = titulos.length
  const terminado = reveladosCount >= total
  const siguiente = terminado ? null : titulos[reveladosCount]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Control de revelación</h1>
        <p className="text-sm text-slate-500 mt-1">
          Revela los títulos uno por uno. La pestaña Proyección muestra lo ya revelado.
        </p>
      </div>

      {/* Progreso */}
      <p className="text-sm text-slate-600">
        Revelados <span className="font-semibold text-slate-900">{reveladosCount}</span> de{' '}
        <span className="font-semibold text-slate-900">{total}</span>
      </p>

      {/* Lista de títulos con su estado */}
      <ul className="space-y-2">
        {titulos.map((t, i) => {
          const revelado = i < reveladosCount
          const enTurno = i === reveladosCount
          return (
            <li
              key={t.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-colors ${
                revelado
                  ? 'bg-white border-gray-200'
                  : enTurno
                    ? 'bg-brand-50 border-brand-300'
                    : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{t.titulo}</p>
                <p className={`text-sm truncate ${revelado ? 'text-slate-600' : 'text-slate-400'}`}>
                  {revelado ? t.participante : 'Sin revelar'}
                </p>
              </div>
              {revelado ? (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full flex-shrink-0">
                  Revelado
                </span>
              ) : enTurno ? (
                <span className="text-xs font-medium text-brand-700 bg-brand-100 px-2 py-1 rounded-full flex-shrink-0">
                  Siguiente
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500 bg-gray-200 px-2 py-1 rounded-full flex-shrink-0">
                  Pendiente
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={revelarSiguiente}
          disabled={terminado}
          className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300
            disabled:cursor-not-allowed text-white font-semibold rounded-lg text-base transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
        >
          {terminado ? 'Todos revelados' : `Revelar: ${siguiente?.titulo}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirmarReinicio(true)}
          disabled={reveladosCount === 0}
          className="py-3 px-4 border border-gray-300 text-slate-700 font-medium rounded-lg text-sm
            hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
            focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Reiniciar
        </button>
      </div>

      {confirmarReinicio && (
        <ConfirmDialog
          titulo="Reiniciar revelación"
          mensaje="Se ocultarán todos los títulos revelados y el show volverá a empezar. ¿Continuar?"
          textoConfirmar="Reiniciar"
          peligro
          onConfirmar={() => {
            reiniciar()
            setConfirmarReinicio(false)
          }}
          onCancelar={() => setConfirmarReinicio(false)}
        />
      )}
    </div>
  )
}

export default ControlPage
