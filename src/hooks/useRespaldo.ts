// Descarga del respaldo de la BD desde el navegador (Fase 10, Bloque 4).
// Lee las 20 tablas con la sesión del encargado y baja un JSON. Solo lectura.

import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { BUCKET_FOTOS } from '../utils/url-foto'
import { mensajeError } from '../utils/mensaje-error'
import {
  nombreArchivoRespaldo,
  ORDEN_RESPALDO,
  TABLAS_RESPALDO,
  type TablaPublica,
} from '../utils/respaldo'

const TAM_PAGINA = 1000

interface Respaldo {
  generado: string
  proyecto: string
  conteos: Record<string, number>
  /** Rutas del bucket de fotos. Las fotos son públicas: con la ruta se recuperan. */
  fotos: string[]
  tablas: Record<string, unknown[]>
}

async function leerTabla(tabla: TablaPublica): Promise<unknown[]> {
  const filas: unknown[] = []
  for (let desde = 0; ; desde += TAM_PAGINA) {
    // El nombre de la tabla es dinámico: el cliente tipado no puede inferir
    // la columna de orden de una unión de 20 tablas, por eso se pasa como string.
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .order(ORDEN_RESPALDO[tabla] as never, { ascending: true })
      .range(desde, desde + TAM_PAGINA - 1)
    if (error) throw new Error(`${tabla}: ${error.message}`)
    filas.push(...(data ?? []))
    if ((data ?? []).length < TAM_PAGINA) return filas
  }
}

// El bucket se organiza en carpetas por edición: <edition_id>/<uuid>.jpg
async function listarFotos(): Promise<string[]> {
  const { data: carpetas, error } = await supabase.storage.from(BUCKET_FOTOS).list('', { limit: 1000 })
  if (error) throw new Error(`Fotos: ${error.message}`)
  const rutas: string[] = []
  for (const carpeta of carpetas ?? []) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error: errLista } = await supabase.storage
        .from(BUCKET_FOTOS)
        .list(carpeta.name, { limit: 1000, offset })
      if (errLista) throw new Error(`Fotos ${carpeta.name}: ${errLista.message}`)
      rutas.push(...(data ?? []).map((o) => `${carpeta.name}/${o.name}`))
      if (!data || data.length < 1000) break
    }
  }
  return rutas
}

async function armarRespaldo(): Promise<Respaldo> {
  // Una tabla a la vez: son pocas filas y así no se satura la conexión del
  // evento si se respalda con los jueces calificando.
  const tablas: Record<string, unknown[]> = {}
  const conteos: Record<string, number> = {}
  for (const tabla of TABLAS_RESPALDO) {
    tablas[tabla] = await leerTabla(tabla)
    conteos[tabla] = tablas[tabla].length
  }
  return {
    generado: new Date().toISOString(),
    proyecto: new URL(import.meta.env.VITE_SUPABASE_URL as string).hostname,
    conteos,
    fotos: await listarFotos(),
    tablas,
  }
}

function descargar(contenido: string, nombre: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export function useRespaldo() {
  const [generando, setGenerando] = useState(false)

  const generar = useCallback(async () => {
    setGenerando(true)
    try {
      await toast.promise(
        (async () => {
          const respaldo = await armarRespaldo()
          descargar(JSON.stringify(respaldo, null, 2), nombreArchivoRespaldo(new Date()))
          return respaldo
        })(),
        {
          loading: 'Generando respaldo...',
          success: (r) =>
            `Respaldo descargado: ${Object.values(r.conteos).reduce((a, b) => a + b, 0)} registros`,
          error: (err: unknown) => mensajeError(err, 'No se pudo generar el respaldo'),
        },
      )
    } catch {
      // toast.promise ya mostró el error; solo se libera el botón.
    } finally {
      setGenerando(false)
    }
  }, [])

  return { generar, generando }
}
