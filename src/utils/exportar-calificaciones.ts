// Armado del reporte de detalle de calificaciones (Fase 8).
//
// Función pura: recibe los datos crudos y devuelve tablas genéricas (títulos,
// columnas, filas). No sabe nada de SheetJS ni de jsPDF; los generadores solo
// pintan lo que sale de aquí. Así toda la lógica — orden, promedios, marcas de
// PRELIMINAR — se prueba sin tocar ninguna librería, y el Excel y el PDF no
// pueden contar cosas distintas.

import { calcularFilasPromedio } from './promedios'
import type { PuntoJuez } from './promedios'
import { formatearPuntaje } from './puntaje'
import { slugify } from './slugify'

// ─── Entrada ──────────────────────────────────────────────────────────────────

export interface RetoExport {
  id: string
  name: string
  order_num: number
}

export interface ParticipanteExport {
  id: string
  full_name: string
  region: string
  sash_number: number
}

export interface PuntoEncargadoExport {
  participant_id: string
  challenge_id: string
  score: number
}

export interface RondaExport {
  id: string
  stage_name: string
  stage_order: number
  status: 'abierta' | 'cerrada'
}

/** FilaPuntoJuez encaja estructuralmente. */
export interface PuntoJuezExport extends PuntoJuez {
  judge_id: string
  judge_name: string
  challenge_name: string
  challenge_order: number
  updated_at: string
  round_id: string
}

export interface DatosExportacion {
  edicion: { name: string; year: number }
  generadoPor: string
  generadoEn: Date
  retos: RetoExport[]
  participantes: ParticipanteExport[]
  puntosEncargado: PuntoEncargadoExport[]
  rondas: RondaExport[]
  puntajesJueces: PuntoJuezExport[]
}

// ─── Salida ───────────────────────────────────────────────────────────────────

/** Celda: número (se queda numérico en Excel), texto, o vacía. */
export type Celda = string | number | null

export interface Tabla {
  titulo: string
  columnas: string[]
  filas: Celda[][]
}

export interface SeccionRonda {
  titulo: string
  preliminar: boolean
  resumen: Tabla
  /** Una tabla por reto: participantes × jueces + promedio. Solo PDF. */
  porReto: Tabla[]
}

export interface ReporteCalificaciones {
  nombreArchivo: string
  titulo: string
  cabecera: string[]
  retosEncargado: Tabla
  detalleJueces: Tabla
  rondas: SeccionRonda[]
}

export const LEYENDA_CONFIDENCIAL =
  'DOCUMENTO CONFIDENCIAL — contiene calificaciones individuales de jueces. No distribuir.'

// La hora se fija a la del evento: si se formatea con la zona de la máquina,
// un reporte sacado en una laptop mal configurada tendría otra hora.
const ZONA = 'America/Mexico_City'

function formatearFechaHora(fecha: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(fecha)
}

function fechaIso(fecha: Date): string {
  // en-CA formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(fecha)
}

/** 2 decimales como número, para que Excel lo siga tratando como número. */
function redondear(n: number): number {
  return Number(n.toFixed(2))
}

function tituloRonda(r: RondaExport): string {
  return r.status === 'abierta'
    ? `${r.stage_name} — PRELIMINAR (ronda abierta)`
    : `${r.stage_name} — ronda cerrada`
}

// ─── Armado ───────────────────────────────────────────────────────────────────

function armarRetosEncargado(d: DatosExportacion): Tabla {
  const retos = [...d.retos].sort((a, b) => a.order_num - b.order_num)
  const participantes = [...d.participantes].sort((a, b) => a.sash_number - b.sash_number)

  // participant_id -> challenge_id -> score
  const puntos = new Map<string, Map<string, number>>()
  for (const p of d.puntosEncargado) {
    let fila = puntos.get(p.participant_id)
    if (!fila) {
      fila = new Map()
      puntos.set(p.participant_id, fila)
    }
    fila.set(p.challenge_id, p.score)
  }

  return {
    titulo: 'Retos del encargado',
    columnas: ['Banda', 'Participante', 'Región', ...retos.map((r) => r.name), 'Total'],
    filas: participantes.map((p) => {
      const suyos = puntos.get(p.id)
      const valores = retos.map((r) => suyos?.get(r.id) ?? null)
      const total = valores.reduce<number>((acc, v) => acc + (v ?? 0), 0)
      return [p.sash_number, p.full_name, p.region, ...valores, redondear(total)]
    }),
  }
}

function armarDetalleJueces(d: DatosExportacion, rondas: RondaExport[]): Tabla {
  const porId = new Map(rondas.map((r) => [r.id, r]))
  const filas = d.puntajesJueces
    .filter((p) => porId.has(p.round_id))
    .sort((a, b) => {
      const ra = porId.get(a.round_id)?.stage_order ?? 0
      const rb = porId.get(b.round_id)?.stage_order ?? 0
      if (ra !== rb) return ra - rb
      const juez = a.judge_name.localeCompare(b.judge_name, 'es')
      if (juez !== 0) return juez
      if (a.sash_number !== b.sash_number) return a.sash_number - b.sash_number
      return a.challenge_order - b.challenge_order
    })

  return {
    titulo: 'Detalle de jueces',
    columnas: [
      'Etapa',
      'Estado ronda',
      'Juez',
      'Banda',
      'Participante',
      'Región',
      'Reto',
      'Puntaje',
      'Capturado',
    ],
    filas: filas.map((p) => {
      const r = porId.get(p.round_id)
      return [
        r?.stage_name ?? '',
        r?.status ?? '',
        p.judge_name,
        p.sash_number,
        p.participant_name,
        p.participant_region,
        p.challenge_name,
        p.score,
        formatearFechaHora(new Date(p.updated_at)),
      ]
    }),
  }
}

function armarSeccionRonda(
  ronda: RondaExport,
  puntajes: PuntoJuezExport[],
  totalesEncargado: Map<string, number>,
): SeccionRonda {
  // Retos que efectivamente tienen puntajes en esta ronda, en su orden.
  const retosMap = new Map<string, { name: string; order: number }>()
  for (const p of puntajes) {
    retosMap.set(p.challenge_id, { name: p.challenge_name, order: p.challenge_order })
  }
  const retos = [...retosMap.entries()]
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => a.order - b.order)

  const filasPromedio = calcularFilasPromedio(puntajes, totalesEncargado)

  const resumen: Tabla = {
    titulo: `Resumen — ${tituloRonda(ronda)}`,
    columnas: [
      'Pos.',
      'Banda',
      'Participante',
      'Región',
      ...retos.map((r) => `Prom. ${r.name}`),
      'Promedio jueces',
      'Calificaciones',
      'Pts. encargado',
    ],
    filas: filasPromedio.map((f) => [
      f.posicion,
      f.sash,
      f.name,
      f.region,
      ...retos.map((r) => {
        const x = f.porReto.get(r.id)
        return x && x.cuenta > 0 ? redondear(x.suma / x.cuenta) : null
      }),
      redondear(f.promedio),
      f.cuenta,
      redondear(f.totalEncargado),
    ]),
  }

  // Jueces con al menos un puntaje en la ronda, por nombre.
  const juecesMap = new Map<string, string>()
  for (const p of puntajes) juecesMap.set(p.judge_id, p.judge_name)
  const jueces = [...juecesMap.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))

  const porReto: Tabla[] = retos.map((reto) => {
    const delReto = puntajes.filter((p) => p.challenge_id === reto.id)
    // participant_id -> { datos, judge_id -> score }
    const porParticipante = new Map<
      string,
      { sash: number; name: string; region: string; scores: Map<string, number> }
    >()
    for (const p of delReto) {
      let fila = porParticipante.get(p.participant_id)
      if (!fila) {
        fila = {
          sash: p.sash_number,
          name: p.participant_name,
          region: p.participant_region,
          scores: new Map(),
        }
        porParticipante.set(p.participant_id, fila)
      }
      fila.scores.set(p.judge_id, p.score)
    }

    return {
      titulo: reto.name,
      columnas: ['Banda', 'Participante', 'Región', ...jueces.map(([, n]) => n), 'Promedio'],
      filas: [...porParticipante.values()]
        .sort((a, b) => a.sash - b.sash)
        .map((f) => {
          const valores = jueces.map(([id]) => f.scores.get(id) ?? null)
          const presentes = valores.filter((v): v is number => v !== null)
          const promedio =
            presentes.length > 0
              ? redondear(presentes.reduce((a, b) => a + b, 0) / presentes.length)
              : null
          return [f.sash, f.name, f.region, ...valores, promedio]
        }),
    }
  })

  return { titulo: tituloRonda(ronda), preliminar: ronda.status === 'abierta', resumen, porReto }
}

export function armarReporteCalificaciones(d: DatosExportacion): ReporteCalificaciones {
  const rondas = [...d.rondas].sort((a, b) => a.stage_order - b.stage_order)

  // Totales del encargado por participante, igual que en Promedios del director.
  const totalesEncargado = new Map<string, number>()
  for (const p of d.puntosEncargado) {
    totalesEncargado.set(p.participant_id, (totalesEncargado.get(p.participant_id) ?? 0) + p.score)
  }

  const hayPreliminar = rondas.some((r) => r.status === 'abierta')
  const titulo = `Detalle de calificaciones — ${d.edicion.name} ${d.edicion.year}`

  const cabecera = [
    LEYENDA_CONFIDENCIAL,
    `Generado el ${formatearFechaHora(d.generadoEn)} por ${d.generadoPor}`,
    ...(hayPreliminar
      ? ['PRELIMINAR: hay rondas abiertas; sus calificaciones todavía pueden cambiar.']
      : []),
  ]

  return {
    nombreArchivo: `calificaciones-${slugify(d.edicion.name)}-${fechaIso(d.generadoEn)}`,
    titulo,
    cabecera,
    retosEncargado: armarRetosEncargado(d),
    detalleJueces: armarDetalleJueces(d, rondas),
    rondas: rondas.map((r) =>
      armarSeccionRonda(
        r,
        d.puntajesJueces.filter((p) => p.round_id === r.id),
        totalesEncargado,
      ),
    ),
  }
}

/** Celda para el PDF: vacía como guion, números con el formato de la app. */
export function celdaATexto(c: Celda): string {
  if (c === null) return '—'
  if (typeof c === 'number') return formatearPuntaje(c)
  return c
}
