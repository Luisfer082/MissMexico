import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { scoreSchema } from '../schemas/calificacion'

interface Props {
  scoreId: string
  value: number
  onSave: (scoreId: string, value: number) => Promise<void>
  // Notifica a la matriz cuando la celda gana/pierde foco (resaltado crosshair)
  onFocusChange?: (enfocado: boolean) => void
}

// Estado visual de la celda. 'idle' es el estado base.
type EstadoCelda = 'idle' | 'guardando' | 'guardado' | 'error'

function ScoreCell({ scoreId, value, onSave, onFocusChange }: Props) {
  // Texto que muestra el input (estado local, desacoplado de la prop mientras se edita)
  const [texto, setTexto] = useState(() => String(value))
  const [estado, setEstado] = useState<EstadoCelda>('idle')

  // Ref para saber si el input está enfocado sin causar re-renders ni efectos extra
  const enfocadoRef = useRef(false)

  // Sincroniza con la prop solo cuando el input NO está enfocado.
  // Permite que el eco realtime de otro cliente actualice la celda en vivo.
  useEffect(() => {
    if (!enfocadoRef.current) {
      setTexto(String(value))
    }
  }, [value])

  // Limpia el timeout del estado 'guardado' para no setear estado tras unmount
  useEffect(() => {
    if (estado !== 'guardado') return
    const id = setTimeout(() => setEstado('idle'), 1000)
    return () => clearTimeout(id)
  }, [estado])

  const handleGuardar = async () => {
    const n = Number(texto)

    // Sin cambio respecto al valor original: normalizar texto y salir
    if (n === value) {
      setTexto(String(value))
      setEstado('idle')
      return
    }

    // Validación con Zod (0-10, máx 2 decimales)
    const resultado = scoreSchema.safeParse(n)
    if (!resultado.success) {
      setEstado('error')
      const mensaje = resultado.error.issues[0]?.message ?? 'Puntaje inválido'
      toast.error(mensaje)
      return
    }

    setEstado('guardando')
    try {
      await onSave(scoreId, resultado.data)
      setEstado('guardado')
    } catch {
      setEstado('error')
      toast.error('No se pudo guardar el puntaje')
      // Revertir al valor original confirmado
      setTexto(String(value))
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    enfocadoRef.current = true
    onFocusChange?.(true)
    // Seleccionar el contenido para sobrescribir directo (flujo rápido de captura)
    e.currentTarget.select()
    // Al enfocar, limpiar el estado de error previo para que el ring no distraiga
    if (estado === 'error') setEstado('idle')
  }

  const handleBlur = () => {
    enfocadoRef.current = false
    onFocusChange?.(false)
    void handleGuardar()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter dispara blur, que a su vez llama handleGuardar (un solo camino de guardado)
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    // Escape revierte sin guardar
    if (e.key === 'Escape') {
      setTexto(String(value))
      setEstado('idle')
      e.currentTarget.blur()
    }
  }

  // Clases del input según estado visual
  const claseEstado: string = (() => {
    switch (estado) {
      case 'guardando':
        return 'border border-gray-200 text-slate-400 cursor-not-allowed'
      case 'guardado':
        return 'border-transparent ring-2 ring-emerald-400 bg-emerald-50 text-emerald-900'
      case 'error':
        return 'border-transparent ring-2 ring-red-400 bg-red-50'
      default:
        // idle
        return [
          'border border-gray-200 bg-white',
          'hover:border-brand-300',
          'focus:ring-2 focus:ring-brand-500 focus:border-transparent',
        ].join(' ')
    }
  })()

  return (
    <span className="relative inline-flex">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min={0}
        max={10}
        value={texto}
        disabled={estado === 'guardando'}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={[
          // h-11 = 44px: touch target mínimo recomendado
          'w-[4.5rem] h-11 text-base font-medium text-center rounded-lg',
          'focus:outline-none transition-all duration-200',
          claseEstado,
        ].join(' ')}
      />
      {/* Mini spinner dentro de la celda mientras guarda */}
      {estado === 'guardando' && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="block w-3.5 h-3.5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
        </span>
      )}
    </span>
  )
}

export default ScoreCell
