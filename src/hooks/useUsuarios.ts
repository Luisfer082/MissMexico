import { useCallback, useMemo } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../utils/mensaje-error'
import { useConsulta } from './useConsulta'
import type { Tables } from '../types/database'
import type { UsuarioCrearFormData, UsuarioEditarFormData } from '../schemas/usuario'

export type Usuario = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'email' | 'role' | 'active'>

interface EstadoUsuarios {
  usuarios: Usuario[]
  // Ids que ya tienen calificaciones o asignación de ronda: no se pueden
  // eliminar (el FK es on delete cascade y se llevaría sus datos por delante).
  conHistorial: Set<string>
  loading: boolean
  error: string | null
  recargar: () => void
  crear: (datos: UsuarioCrearFormData) => Promise<void>
  actualizar: (userId: string, datos: UsuarioEditarFormData) => Promise<void>
  cambiarEstado: (userId: string, active: boolean) => Promise<void>
  eliminar: (userId: string) => Promise<void>
}

// Las respuestas de error de la Edge Function traen el detalle en el cuerpo,
// no en error.message (que solo dice "non-2xx status code"). Hay que abrirlo.
async function mensajeFuncion(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const cuerpo: unknown = await err.context.json()
      if (typeof cuerpo === 'object' && cuerpo !== null && 'error' in cuerpo) {
        const detalle = (cuerpo as { error: unknown }).error
        if (typeof detalle === 'string' && detalle.trim() !== '') return detalle
      }
    } catch {
      // Cuerpo no-JSON: se cae al mensaje genérico de abajo.
    }
  }
  return mensajeError(err, 'No se pudo completar la operación')
}

async function invocar(body: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-usuarios', { body })
  if (error) throw new Error(await mensajeFuncion(error))
}

interface DatosUsuarios {
  usuarios: Usuario[]
  conHistorial: Set<string>
}

export function useUsuarios(): EstadoUsuarios {
  // useConsulta aporta loading + error + la bandera `cancelado` que evita que
  // una respuesta lenta pise a una nueva. La consulta compuesta se adapta a su
  // forma { data, error } devolviendo el error de la primera query que falle.
  const { datos, loading, error, recargar } = useConsulta<DatosUsuarios>(
    async () => {
      // Los tres son independientes → una sola tanda paralela.
      const [
        { data: perfiles, error: errPerfiles },
        { data: scores, error: errScores },
        { data: asignaciones, error: errAsignaciones },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, role, active')
          .order('full_name', { ascending: true }),
        supabase.from('judge_scores').select('judge_id'),
        supabase.from('judge_round_judges').select('judge_id'),
      ])

      const fallo = errPerfiles ?? errScores ?? errAsignaciones
      if (fallo) return { data: null, error: fallo }

      const historial = new Set<string>()
      for (const s of scores ?? []) historial.add(s.judge_id)
      for (const a of asignaciones ?? []) historial.add(a.judge_id)

      return { data: { usuarios: perfiles ?? [], conHistorial: historial }, error: null }
    },
    [],
  )

  // Identidades estables mientras no llegan los datos: sin esto, cada render
  // crearía un array y un Set nuevos y haría rerenderizar la lista sin motivo.
  const vacio = useMemo(() => ({ usuarios: [], conHistorial: new Set<string>() }), [])
  const { usuarios, conHistorial } = datos ?? vacio

  const crear = useCallback(async (datos: UsuarioCrearFormData) => {
    await invocar({ accion: 'crear', ...datos })
    recargar()
  }, [recargar])

  const actualizar = useCallback(async (userId: string, datos: UsuarioEditarFormData) => {
    await invocar({ accion: 'actualizar', userId, ...datos })
    recargar()
  }, [recargar])

  const cambiarEstado = useCallback(async (userId: string, active: boolean) => {
    await invocar({ accion: 'estado', userId, active })
    recargar()
  }, [recargar])

  const eliminar = useCallback(async (userId: string) => {
    await invocar({ accion: 'eliminar', userId })
    recargar()
  }, [recargar])

  return { usuarios, conHistorial, loading, error, recargar, crear, actualizar, cambiarEstado, eliminar }
}
