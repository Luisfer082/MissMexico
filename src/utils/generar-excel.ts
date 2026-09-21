// Generador del Excel de detalle de calificaciones (Fase 8).
//
// Se carga con import() dinámico desde useExportarCalificaciones: SheetJS solo
// se descarga cuando alguien presiona Exportar, nunca en el bundle de un rol.
// Aquí no hay lógica de negocio: solo se pinta el reporte que armó
// exportar-calificaciones.ts.

import { utils, writeFile } from 'xlsx'
import type { WorkBook, WorkSheet } from 'xlsx'
import type { Celda, ReporteCalificaciones, Tabla } from './exportar-calificaciones'

type FilaHoja = Celda[]

/** Cabecera común de cada hoja: título, leyenda de confidencial, fecha. */
function filasCabecera(reporte: ReporteCalificaciones, subtitulo: string): FilaHoja[] {
  return [[reporte.titulo], [subtitulo], ...reporte.cabecera.map((l) => [l]), []]
}

function filasTabla(tabla: Tabla): FilaHoja[] {
  return [tabla.columnas, ...tabla.filas]
}

// Ancho de columna aproximado al contenido más largo, con tope para que una
// celda larga no deje la hoja inservible. Las filas de cabecera se ignoran:
// son una sola celda larga que desbordaría la columna A.
function hoja(filas: FilaHoja[], filasIgnoradas: number): WorkSheet {
  const ws = utils.aoa_to_sheet(filas)
  const anchos: number[] = []
  for (const fila of filas.slice(filasIgnoradas)) {
    fila.forEach((c, i) => {
      const largo = c === null ? 0 : String(c).length
      anchos[i] = Math.max(anchos[i] ?? 8, Math.min(largo + 2, 40))
    })
  }
  ws['!cols'] = anchos.map((wch) => ({ wch }))
  return ws
}

/** Arma el libro sin descargarlo (separado para poder probarlo). */
export function crearLibro(reporte: ReporteCalificaciones): WorkBook {
  const libro = utils.book_new()

  const cabRetos = filasCabecera(reporte, reporte.retosEncargado.titulo)
  utils.book_append_sheet(
    libro,
    hoja([...cabRetos, ...filasTabla(reporte.retosEncargado)], cabRetos.length),
    'Retos encargado',
  )

  const cabDetalle = filasCabecera(reporte, reporte.detalleJueces.titulo)
  utils.book_append_sheet(
    libro,
    hoja([...cabDetalle, ...filasTabla(reporte.detalleJueces)], cabDetalle.length),
    'Jueces (detalle)',
  )

  // Una sola hoja con las rondas apiladas: el título de cada ronda (con su
  // PRELIMINAR si está abierta) va en su propia fila, separado por una vacía.
  const cabResumen = filasCabecera(reporte, 'Resumen por ronda')
  const filasResumen: FilaHoja[] = [...cabResumen]
  if (reporte.rondas.length === 0) filasResumen.push(['Sin rondas de jueces en esta edición.'])
  for (const seccion of reporte.rondas) {
    filasResumen.push([seccion.resumen.titulo], ...filasTabla(seccion.resumen), [])
  }
  utils.book_append_sheet(libro, hoja(filasResumen, cabResumen.length), 'Resumen por ronda')

  return libro
}

export function generarExcel(reporte: ReporteCalificaciones): void {
  writeFile(crearLibro(reporte), `${reporte.nombreArchivo}.xlsx`)
}
