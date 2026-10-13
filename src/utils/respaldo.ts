// Respaldo de la BD desde el navegador (Fase 10, Bloque 4). Parte pura: qué
// tablas entran y cómo se llama el archivo. La descarga vive en useRespaldo.
//
// En el plan Free de Supabase no hay backups. El encargado puede leer las 20
// tablas con su propia sesión (RLS verificada el 2026-10-13), así que el
// respaldo no necesita service_role ni Edge Function.

import type { Database } from '../types/database'

export type TablaPublica = keyof Database['public']['Tables']

/**
 * Columna con la que se pagina cada tabla. Sin ORDER BY, dos páginas podrían
 * repetir o saltarse filas. Es un Record sobre TODAS las tablas: si una
 * migración agrega una tabla y se regeneran los tipos, el typecheck falla aquí
 * hasta que se agregue, así que ninguna se queda fuera del respaldo en silencio.
 */
export const ORDEN_RESPALDO: Record<TablaPublica, string> = {
  announcement_order: 'id',
  announcement_progress: 'edition_id',
  audit_log: 'id',
  challenge_scores: 'id',
  challenges: 'id',
  edition_publications: 'edition_id',
  editions: 'id',
  judge_round_challenges: 'id',
  judge_round_judges: 'id',
  judge_rounds: 'id',
  judge_scores: 'id',
  manual_rankings: 'id',
  observations: 'id',
  participants: 'id',
  profiles: 'id',
  stage_participants: 'id',
  stage_snapshots: 'id',
  stages: 'id',
  title_assignments: 'id',
  titles: 'id',
}

export const TABLAS_RESPALDO = Object.keys(ORDEN_RESPALDO) as TablaPublica[]

/** `respaldo-2026-10-13_1745.json`, en hora de México (la del evento, no la de la laptop). */
export function nombreArchivoRespaldo(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha)
  const v = (t: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === t)?.value ?? ''
  return `respaldo-${v('year')}-${v('month')}-${v('day')}_${v('hour')}${v('minute')}.json`
}
