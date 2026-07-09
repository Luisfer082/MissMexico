// Wrapper del edicionSlice que conserva la API original del hook: las páginas
// consumidoras siguen recibiendo { edicion, loading, error } sin enterarse de
// que ahora la edición activa vive cacheada en el store (una sola query por
// sesión en vez de una por navegación).

import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../stores/useAppStore'
import type { Tables } from '../types/database'

interface UseEdicionActivaResult {
  edicion: Tables<'editions'> | null
  loading: boolean
  error: string | null
}

export function useEdicionActiva(): UseEdicionActivaResult {
  const { edicionActiva, edicionLoading, edicionError, cargarEdicionActiva } = useAppStore(
    useShallow((s) => ({
      edicionActiva: s.edicionActiva,
      edicionLoading: s.edicionLoading,
      edicionError: s.edicionError,
      cargarEdicionActiva: s.cargarEdicionActiva,
    })),
  )

  // Dispara la carga solo si el caché está vacío (dedupe dentro del slice)
  useEffect(() => {
    void cargarEdicionActiva()
  }, [cargarEdicionActiva])

  return { edicion: edicionActiva, loading: edicionLoading, error: edicionError }
}
