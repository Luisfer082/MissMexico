// Generador del PDF de detalle de calificaciones (Fase 8).
//
// Igual que el Excel: se carga con import() dinámico y solo pinta lo que armó
// exportar-calificaciones.ts. Carta horizontal, porque la tabla por reto lleva
// una columna por juez.

import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { celdaATexto, LEYENDA_CONFIDENCIAL } from './exportar-calificaciones'
import type { ReporteCalificaciones, Tabla } from './exportar-calificaciones'

const MARGEN = 36
const ROJO: [number, number, number] = [185, 28, 28]
const AMBAR: [number, number, number] = [180, 83, 9]
const GRIS: [number, number, number] = [75, 85, 99]
const NEGRO: [number, number, number] = [17, 24, 39]

/** Arma el documento sin descargarlo (separado para poder probarlo). */
export function crearPdf(reporte: ReporteCalificaciones): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const alto = doc.internal.pageSize.getHeight()
  const ancho = doc.internal.pageSize.getWidth()
  let y = MARGEN

  /** Salta de página si lo que sigue no cabe. */
  function reservar(espacio: number) {
    if (y + espacio > alto - MARGEN) {
      doc.addPage()
      y = MARGEN
    }
  }

  function texto(t: string, tam: number, color: [number, number, number], negrita = false) {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal')
    doc.setFontSize(tam)
    doc.setTextColor(...color)
    const lineas = doc.splitTextToSize(t, ancho - MARGEN * 2) as string[]
    reservar(lineas.length * tam * 1.3)
    doc.text(lineas, MARGEN, y + tam)
    y += lineas.length * tam * 1.3
  }

  function tabla(t: Tabla, titulo: string) {
    reservar(60)
    texto(titulo, 10, NEGRO, true)
    y += 2
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN, top: MARGEN, bottom: MARGEN + 14 },
      head: [t.columnas],
      body: t.filas.map((f) => f.map(celdaATexto)),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [31, 41, 55], textColor: 255 },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      didDrawPage: (data) => {
        if (data.cursor) y = data.cursor.y
      },
    })
    y += 14
  }

  // Cabecera del documento
  texto(reporte.titulo, 16, NEGRO, true)
  for (const linea of reporte.cabecera) {
    if (linea === LEYENDA_CONFIDENCIAL) texto(linea, 9, ROJO, true)
    else if (linea.startsWith('PRELIMINAR')) texto(linea, 9, AMBAR, true)
    else texto(linea, 9, GRIS)
  }
  y += 8

  if (reporte.rondas.length === 0) {
    texto('Sin rondas de jueces en esta edición.', 11, GRIS)
  }

  // Cada ronda empieza en página nueva: es la unidad que se revisa y se firma.
  reporte.rondas.forEach((seccion, i) => {
    if (i > 0) {
      doc.addPage()
      y = MARGEN
    }
    texto(seccion.titulo, 13, seccion.preliminar ? AMBAR : NEGRO, true)
    y += 4
    tabla(seccion.resumen, 'Resumen')
    for (const t of seccion.porReto) tabla(t, `Reto: ${t.titulo}`)
  })

  // Pie en todas las páginas, al final para conocer el total.
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS)
    doc.text(`Documento confidencial · ${reporte.titulo}`, MARGEN, alto - MARGEN / 2)
    doc.text(`Página ${p} de ${total}`, ancho - MARGEN, alto - MARGEN / 2, { align: 'right' })
  }

  return doc
}

export function generarPdf(reporte: ReporteCalificaciones): void {
  crearPdf(reporte).save(`${reporte.nombreArchivo}.pdf`)
}
