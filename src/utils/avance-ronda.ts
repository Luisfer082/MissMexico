// Avance de captura de una ronda de jueces: cuántas calificaciones mandó cada
// juez frente a las que le tocan. Se muestra antes de cerrar una etapa o una
// ronda, porque lo que no llegó a la BD se pierde al cerrar (el trigger
// prevent_judge_score_on_closed_round rechaza la sincronización tardía).
//
// Límite: la BD no distingue "no calificó" de "calificó sin conexión y no ha
// sincronizado". Por eso se habla de calificaciones faltantes, no pendientes.

export interface JuezRonda {
  id: string
  nombre: string
  activo: boolean
}

export interface ScoreRonda {
  judge_id: string
  participant_id: string
  challenge_id: string
}

export interface AvanceJuez extends JuezRonda {
  capturadas: number
  esperadas: number
}

export interface AvanceRonda {
  /**
   * TODOS los jueces asignados a la ronda, activos e inactivos. Se listan
   * completo el aviso: si a alguno se le pierde la asignación, se nota en
   * pantalla en vez de desaparecer en silencio.
   * Orden: primero a los que les falta más, los inactivos al final.
   */
  jueces: AvanceJuez[]
  /** Jueces activos a los que les falta al menos una calificación. */
  incompletos: AvanceJuez[]
  totalJuecesActivos: number
  /** Ningún juez activo tiene calificaciones faltantes. */
  completa: boolean
}

export function contarAvance(
  jueces: JuezRonda[],
  retoIds: string[],
  participanteIds: string[],
  scores: ScoreRonda[],
): AvanceRonda {
  const retos = new Set(retoIds)
  const participantes = new Set(participanteIds)
  const esperadas = retos.size * participantes.size

  // Solo cuentan los scores de retos y participantes que SIGUEN en la ronda:
  // la ronda es editable y los scores de un reto quitado quedan en la BD, así
  // que sin este filtro un juez incompleto podría parecer completo. No hace
  // falta deduplicar: judge_scores es unique (judge_id, participant_id, challenge_id).
  const capturadasPorJuez = new Map<string, number>()
  for (const s of scores) {
    if (!retos.has(s.challenge_id) || !participantes.has(s.participant_id)) continue
    capturadasPorJuez.set(s.judge_id, (capturadasPorJuez.get(s.judge_id) ?? 0) + 1)
  }

  const todos: AvanceJuez[] = jueces.map((juez) => ({
    ...juez,
    capturadas: capturadasPorJuez.get(juez.id) ?? 0,
    esperadas,
  }))

  // Los inactivos al final; dentro de cada grupo, los que más les falta primero.
  todos.sort(
    (a, b) =>
      Number(b.activo) - Number(a.activo) ||
      a.capturadas - b.capturadas ||
      a.nombre.localeCompare(b.nombre),
  )

  const activos = todos.filter((j) => j.activo)
  const incompletos = activos.filter((j) => j.capturadas < esperadas)

  return {
    jueces: todos,
    incompletos,
    totalJuecesActivos: activos.length,
    completa: incompletos.length === 0,
  }
}
