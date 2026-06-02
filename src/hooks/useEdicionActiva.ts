import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

interface UseEdicionActivaResult {
  edicion: Tables<'editions'> | null
  loading: boolean
  error: string | null
}

export function useEdicionActiva(): UseEdicionActivaResult {
  const [edicion, setEdicion] = useState<Tables<'editions'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEdicion = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: supabaseError } = await supabase
          .from('editions')
          .select('*')
          .eq('is_active', true)
          .single()

        if (supabaseError) {
          // PGRST116 = no rows found — no es error crítico, simplemente no hay edición activa
          if (supabaseError.code === 'PGRST116') {
            setEdicion(null)
          } else {
            setError(supabaseError.message)
          }
        } else {
          setEdicion(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    void fetchEdicion()
  }, [])

  return { edicion, loading, error }
}
