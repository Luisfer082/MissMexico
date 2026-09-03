// Cálculo de promedios de jueces del módulo Director (Fase 9, paso 2).
//
// Vivía duplicado en PromediosPage y RankingPage, cada una con su useMemo. Es
// el número que ordena el ranking y del que salen los títulos: tenerlo en dos
// sitios significaba poder corregir uno y olvidar el otro. Aquí es una función
// pura, sin React ni Supabase, y por eso se puede probar.

/** Forma mínima de un puntaje de juez. FilaPuntoJuez encaja estructuralmente. */
export interface PuntoJuez {
  participant_id: string
  participant_name: string
  participant_region: string
  sash_number: number
  challenge_id: string
  score: number
}

export interface FilaPromedio {
  participant_id: string
  name: string
  region: string
  sash: number
  /** challenge_id -> { suma, cuenta } para promediar por reto */
  porReto: Map<string, { suma: number; cuenta: number }>
  suma: number
  cuenta: number
  promedio: number
  totalEncargado: number
  posicion: number
}

/**
 * Agrega los puntajes de UNA ronda por participante: promedio global, promedio
 * por reto y total del encargado. Orden desc por promedio, desempate asc por
 * número de banda; `posicion` es 1-based.
 *
 * Los puntajes deben venir ya filtrados por ronda: mezclar rondas daría un
 * promedio que no corresponde a ninguna.
 */
export function calcularFilasPromedio(
  puntajes: PuntoJuez[],
  totalesEncargado: Map<string, number> = new Map(),
): FilaPromedio[] {
  const acc = new Map<string, Omit<FilaPromedio, 'promedio' | 'posicion'>>()

  for (const p of puntajes) {
    let fila = acc.get(p.participant_id)
    if (!fila) {
      fila = {
        participant_id: p.participant_id,
        name: p.participant_name,
        region: p.participant_region,
        sash: p.sash_number,
        porReto: new Map(),
        suma: 0,
        cuenta: 0,
        totalEncargado: totalesEncargado.get(p.participant_id) ?? 0,
      }
      acc.set(p.participant_id, fila)
    }
    const reto = fila.porReto.get(p.challenge_id) ?? { suma: 0, cuenta: 0 }
    reto.suma += p.score
    reto.cuenta += 1
    fila.porReto.set(p.challenge_id, reto)
    fila.suma += p.score
    fila.cuenta += 1
  }

  return [...acc.values()]
    .map((f) => ({ ...f, promedio: f.cuenta > 0 ? f.suma / f.cuenta : 0, posicion: 0 }))
    .sort((a, b) => {
      if (b.promedio !== a.promedio) return b.promedio - a.promedio
      return a.sash - b.sash
    })
    .map((f, i) => ({ ...f, posicion: i + 1 }))
}

/** participant_id -> promedio. Las que no calificaron no aparecen en el mapa. */
export function promediosPorParticipante(filas: FilaPromedio[]): Map<string, number> {
  return new Map(filas.map((f) => [f.participant_id, f.promedio]))
}
