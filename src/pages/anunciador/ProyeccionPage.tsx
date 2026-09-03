import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../stores/useAppStore'
import ConfirmDialog from '../../components/ConfirmDialog'

// Pantalla del show (§5.8). Es lo que se ve en el escenario y a la vez desde
// donde se opera: un solo título centrado, enorme, y un botón para revelar el
// siguiente. NO acumula los ya revelados (decisión de Luis 2026-08-26): antes
// se apilaban todos y con 7 títulos el bloque no cabía en pantalla, así que el
// último revelado —el que importa— podía quedar fuera de vista.
//
// Ocupa la pantalla completa por encima del layout: el proyector no debe
// mostrar el header con el nombre del usuario ni las pestañas. Los controles se
// desvanecen solos para dejar la proyección limpia y vuelven con cualquier
// movimiento, tecla o toque.

const MS_OCULTAR_CONTROLES = 4000

function ProyeccionPage() {
  const {
    titulos,
    reveladosCount,
    revelarSiguiente,
    reiniciar,
    loading,
    error,
    publicado,
    avanceError,
  } = useAppStore(
    useShallow((s) => ({
      titulos: s.anuncioTitulos,
      reveladosCount: s.anuncioReveladosCount,
      revelarSiguiente: s.revelarSiguiente,
      reiniciar: s.reiniciarAnuncio,
      loading: s.anuncioLoading,
      error: s.anuncioError,
      publicado: s.anuncioPublicado,
      avanceError: s.anuncioAvanceError,
    })),
  )

  const [controlesVisibles, setControlesVisibles] = useState(true)
  const [confirmarReinicio, setConfirmarReinicio] = useState(false)
  const temporizador = useRef<number | null>(null)

  // Arranca (o reinicia) la cuenta para ocultar los controles. Separado de
  // despertarControles porque el efecto de montaje solo necesita el
  // temporizador: el estado ya nace visible, y llamar a setState dentro del
  // cuerpo de un efecto encadena renders.
  const programarOcultado = useCallback(() => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(
      () => setControlesVisibles(false),
      MS_OCULTAR_CONTROLES,
    )
  }, [])

  // Cualquier señal de que el operador está ahí devuelve los controles y
  // reinicia la cuenta para volver a ocultarlos.
  const despertarControles = useCallback(() => {
    setControlesVisibles(true)
    programarOcultado()
  }, [programarOcultado])

  const terminado = reveladosCount >= titulos.length
  const enPantalla = reveladosCount > 0 ? titulos[reveladosCount - 1] : null
  const siguiente = terminado ? null : titulos[reveladosCount]

  useEffect(() => {
    programarOcultado()
    return () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current)
    }
  }, [programarOcultado])

  // Barra espaciadora / flecha derecha / avanzar página: es lo que manda un
  // presentador inalámbrico, para no depender de tocar la pantalla en vivo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      despertarControles()
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        revelarSiguiente()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [despertarControles, revelarSiguiente])

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
  // Se queda dentro del layout a propósito: no hay nada que proyectar todavía y
  // el operador necesita las pestañas para moverse.
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

  return (
    <div
      onMouseMove={despertarControles}
      onTouchStart={despertarControles}
      className="fixed inset-0 z-30 bg-slate-950 flex flex-col overflow-hidden"
    >
      {/* Título en turno */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-0">
        {enPantalla === null ? (
          <p className="text-slate-500 text-[clamp(1rem,2.5vw,2rem)]">
            Esperando el inicio de la ceremonia…
          </p>
        ) : (
          <>
            <p className="text-brand-400 font-medium uppercase tracking-[0.2em] text-[clamp(0.875rem,2.5vw,2rem)]">
              {enPantalla.titulo}
            </p>
            <p className="text-white font-bold leading-[1.05] mt-[0.4em] text-[clamp(2rem,8vw,7rem)]">
              {enPantalla.participante}
            </p>
          </>
        )}
      </div>

      {/* Controles del operador: se desvanecen solos para dejar limpia la
          proyección. Siguen ocupando su sitio (opacity, no display) para que el
          título no se mueva al aparecer y desaparecer. */}
      <div
        // El padding inferior respeta la safe area: en celular los controles
        // quedaban debajo de la barra del navegador y del gesto de inicio.
        className={`flex-shrink-0 px-4 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]
          transition-opacity duration-500 ${
          controlesVisibles ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          <p className="text-center text-slate-400 text-sm min-h-[1.25rem]">
            {terminado
              ? `Ceremonia completa · ${titulos.length} títulos revelados`
              : `Siguiente: ${siguiente?.titulo ?? ''} · ${reveladosCount} de ${titulos.length}`}
          </p>

          {/* El avance no se pudo guardar. NO se interrumpe el show: solo se
              avisa de que una recarga volvería a empezar. Vive dentro de los
              controles, así que se desvanece con ellos y el público no lo ve. */}
          {avanceError !== null && (
            <p className="text-center text-amber-400/80 text-xs">
              No se pudo guardar el avance: si recargas, el show volvería a empezar.
            </p>
          )}

          <button
            type="button"
            onClick={revelarSiguiente}
            disabled={terminado}
            className="w-full min-h-[64px] px-6 rounded-2xl bg-brand-600 hover:bg-brand-700
              disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed
              text-white font-semibold text-lg transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-400"
          >
            {terminado ? 'Fin de la ceremonia' : 'Revelar siguiente'}
          </button>

          <div className="flex gap-3">
            <Link
              to="/anunciador/orden"
              className="flex-1 inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl
                border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cambiar orden
            </Link>
            <button
              type="button"
              onClick={() => setConfirmarReinicio(true)}
              disabled={reveladosCount === 0}
              className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-300
                hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed
                text-sm font-medium transition-colors"
            >
              Reiniciar
            </button>
          </div>
        </div>
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

export default ProyeccionPage
