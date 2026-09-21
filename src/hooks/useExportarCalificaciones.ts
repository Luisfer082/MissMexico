// Exportación del detalle de calificaciones a Excel o PDF (Fase 8).
// Consumo: Calificaciones (encargado) y Promedios (director).
//
// Consulta los datos al presionar Exportar, no reutiliza los de la pantalla: un
// reporte tiene que reflejar la BD en ese momento, no lo que se cargó hace diez
// minutos. Las librerías (SheetJS, jsPDF) se importan dinámicamente aquí, así
// que solo se descargan la primera vez que alguien exporta.

import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/useAppStore'
import type { Tables } from '../types/database'
import { mensajeError } from '../utils/mensaje-error'
import { armarReporteCalificaciones } from '../utils/exportar-calificaciones'
import type { DatosExportacion } from '../utils/exportar-calificaciones'
import { cargarPuntosJueces } from './usePuntosJueces'

export type FormatoExportacion = 'excel' | 'pdf'

async function cargarDatos(
  edicion: Tables<'editions'>,
  generadoPor: string,
): Promise<DatosExportacion> {
  const [jueces, retos, participantes] = await Promise.all([
    cargarPuntosJueces(edicion.id),
    supabase.from('challenges').select('id, name, order_num').eq('edition_id', edicion.id),
    supabase
      .from('participants')
      .select('id, full_name, region, sash_number')
      .eq('edition_id', edicion.id),
  ])
  if (jueces.error) throw new Error(jueces.error.message)
  if (retos.error) throw new Error(retos.error.message)
  if (participantes.error) throw new Error(participantes.error.message)

  // challenge_scores no tiene edition_id: se filtra por los retos de la edición.
  const retoIds = (retos.data ?? []).map((r) => r.id)
  let puntosEncargado: DatosExportacion['puntosEncargado'] = []
  if (retoIds.length > 0) {
    const { data, error } = await supabase
      .from('challenge_scores')
      .select('participant_id, challenge_id, score')
      .in('challenge_id', retoIds)
    if (error) throw new Error(error.message)
    puntosEncargado = data ?? []
  }

  return {
    edicion: { name: edicion.name, year: edicion.year },
    generadoPor,
    generadoEn: new Date(),
    retos: retos.data ?? [],
    participantes: participantes.data ?? [],
    puntosEncargado,
    rondas: jueces.data?.rondas ?? [],
    puntajesJueces: jueces.data?.puntajes ?? [],
  }
}

export function useExportarCalificaciones(edicion: Tables<'editions'> | null) {
  const profile = useAppStore((s) => s.profile)
  const [exportando, setExportando] = useState<FormatoExportacion | null>(null)

  const exportar = useCallback(
    async (formato: FormatoExportacion) => {
      if (!edicion || exportando) return
      setExportando(formato)
      const generadoPor = profile?.full_name ?? profile?.email ?? 'Usuario'

      const tarea = async () => {
        const reporte = armarReporteCalificaciones(await cargarDatos(edicion, generadoPor))
        if (formato === 'excel') {
          const { generarExcel } = await import('../utils/generar-excel')
          generarExcel(reporte)
        } else {
          const { generarPdf } = await import('../utils/generar-pdf')
          generarPdf(reporte)
        }
      }

      try {
        await toast.promise(tarea(), {
          loading: formato === 'excel' ? 'Generando Excel...' : 'Generando PDF...',
          success: 'Reporte descargado',
          error: (err: unknown) => mensajeError(err, 'No se pudo generar el reporte'),
        })
      } catch {
        // El toast ya mostró el error; aquí solo se evita el rechazo sin manejar.
      } finally {
        setExportando(null)
      }
    },
    [edicion, exportando, profile],
  )

  return { exportar, exportando }
}
