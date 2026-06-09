import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { scoreSchema } from '../schemas/calificacion'

interface Props {
  scoreId: string
  value: number
  onSave: (scoreId: string, value: number) => Promise<void>
}

// Estado visual de la celda. 'idle' es el estado base.
type EstadoCelda = 'idle' | 'guardando' | 'guardado' | 'error'

function ScoreCell({ scoreId, value, onSave }: Props) {
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
    const id = setTimeout(() => setEstado('idle'), 800)
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

  const handleFocus = () => {
    enfocadoRef.current = true
    // Al enfocar, limpiar el estado de error previo para que el ring no distraiga
    if (estado === 'error') setEstado('idle')
  }

  const handleBlur = () => {
    enfocadoRef.current = false
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
        return 'border border-gray-200 opacity-50 cursor-not-allowed'
      case 'guardado':
        return 'ring-2 ring-green-400 border-transparent'
      case 'error':
        return 'ring-2 ring-red-400 border-transparent'
      default:
        // idle
        return 'border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent'
    }
  })()

  return (
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
        'w-16 py-1 text-sm text-center rounded-md focus:outline-none transition-all',
        claseEstado,
      ].join(' ')}
    />
  )
}

export default ScoreCell
