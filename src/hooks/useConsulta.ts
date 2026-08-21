import { useCallback, useEffect, useRef, useState } from 'react'
import { mensajeError } from '../utils/mensaje-error'

// Resultado de una query de Supabase: { data, error }. Se tipa a mano en vez de
// importar PostgrestResponse porque también sirve para promesas compuestas
// (Promise.all) que devuelven la misma forma.
interface Respuesta<T> {
  data: T | null
  error: { message: string } | null
}

export interface UseConsultaResult<T> {
  datos: T | null
  loading: boolean
  /** Mensaje de error de la última carga, o null. */
  error: string | null
  /** Vuelve a ejecutar la consulta (después de crear/editar/borrar). */
  recargar: () => void
}

// Carga de datos de solo lectura: encapsula el bloque loading + error +
// bandera `cancelado` + contador de recarga que estaba copiado en 11 archivos.
//
// La bandera `cancelado` es lo que evita que una respuesta lenta de una consulta
// vieja pise a la nueva (o que se escriba estado tras desmontar el componente).
//
// `consulta` se pasa como función y se guarda en un ref: así puede ser una
// arrow inline sin que su identidad nueva en cada render dispare el efecto. El
// efecto depende solo de `deps`, igual que las dependencias que estaban escritas
// a mano en cada useEffect.
//
// `consulta: null` significa "todavía no hay con qué consultar" (p. ej. falta la
// edición activa): no se ejecuta nada y se queda en loading, que es el
// comportamiento que ya tenían las páginas.
export function useConsulta<T>(
  consulta: (() => PromiseLike<Respuesta<T>>) | null,
  deps: readonly unknown[],
): UseConsultaResult<T> {
  const [datos, setDatos] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  const consultaRef = useRef(consulta)

  // Sincronizar el ref en un efecto (no en render: mutar refs durante el render
  // es un antipatrón). Va declarado ANTES del efecto de carga porque React
  // ejecuta los efectos en orden de declaración, así el de abajo siempre lee la
  // versión más reciente.
  useEffect(() => {
    consultaRef.current = consulta
  })

  const listo = consulta !== null

  useEffect(() => {
    const fn = consultaRef.current
    if (!fn) return

    let cancelado = false
    setLoading(true)

    void (async () => {
      try {
        const { data, error: err } = await fn()
        if (cancelado) return
        if (err) {
          setError(err.message)
        } else {
          setDatos(data)
          setError(null)
        }
      } catch (err) {
        if (cancelado) return
        setError(mensajeError(err, 'No se pudieron cargar los datos'))
      } finally {
        if (!cancelado) setLoading(false)
      }
    })()

    return () => {
      cancelado = true
    }
    // consultaRef evita depender de la identidad de la función; `listo` cubre
    // el paso de null a función (y viceversa).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, listo, recarga])

  const recargar = useCallback(() => setRecarga((n) => n + 1), [])

  return { datos, loading, error, recargar }
}
