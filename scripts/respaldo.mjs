// Respaldo manual de la base de datos (Fase 10, Bloque 4).
//
// Por qué existe: en el plan Free de Supabase no hay backups (verificado el
// 2026-10-13 con `supabase backups list`), y `supabase db dump` exige Docker o
// pg_dump. Este script lee TODAS las tablas de `public` con la API de Supabase
// y las guarda en un JSON con fecha. Es SOLO LECTURA: no escribe nada en la BD.
//
// Uso:
//   npm run respaldo               → tablas + lista de fotos del bucket
//   npm run respaldo -- --con-fotos → además descarga las fotos
//
// Necesita la service_role key (se salta la RLS para poder leerlo todo) en
// `.env.respaldo`, que git ignora por el patrón `.env.*`:
//   SUPABASE_SERVICE_ROLE_KEY=...
// La service_role es admin total: NUNCA va en `.env` (que lee Vite y podría
// acabar en el bundle) ni se comparte. Se saca de Supabase → Project Settings
// → API Keys.
//
// Es un script de consola, no código de la app: aquí console.log es la salida.

import { createClient } from '@supabase/supabase-js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BUCKET_FOTOS = 'fotos-participantes'
const TAM_PAGINA = 1000
const DIR_RESPALDOS = 'respaldos'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const conFotos = process.argv.includes('--con-fotos')

if (!url || !serviceKey) {
  console.error(
    'Faltan variables: VITE_SUPABASE_URL (en .env) y SUPABASE_SERVICE_ROLE_KEY (en .env.respaldo).',
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Las tablas salen de los tipos generados por el CLI, no de una lista a mano:
// si una migración agrega una tabla y se regeneran los tipos, entra sola.
async function leerTablas() {
  const tipos = await readFile('src/types/database.ts', 'utf8')
  // Anclado al inicio de línea: un indexOf('public: {') caería antes dentro de
  // `graphql_public: {`, que es otro schema.
  const inicio = tipos.search(/^ {2}public: \{/m)
  const fin = tipos.indexOf('Views: {', inicio)
  if (inicio === -1 || fin === -1) throw new Error('No se encontró el schema public en database.ts')
  const bloque = tipos.slice(inicio, fin)
  // \r? porque el archivo puede venir con saltos de línea de Windows (CRLF).
  const tablas = [...bloque.matchAll(/^ {6}([a-z_]+): \{\r?$/gm)].map((m) => m[1])
  if (tablas.length === 0) throw new Error('No se encontró ninguna tabla en database.ts')
  return tablas
}

// Pagina con un orden estable: sin ORDER BY, dos páginas podrían repetir o
// saltarse filas. Casi todas las tablas tienen `id`; las que no (p. ej.
// edition_publications) usan `edition_id` como llave.
async function leerTabla(tabla) {
  for (const columna of ['id', 'edition_id']) {
    const filas = []
    let error = null
    for (let desde = 0; ; desde += TAM_PAGINA) {
      const res = await supabase
        .from(tabla)
        .select('*')
        .order(columna, { ascending: true })
        .range(desde, desde + TAM_PAGINA - 1)
      if (res.error) {
        error = res.error
        break
      }
      filas.push(...res.data)
      if (res.data.length < TAM_PAGINA) break
    }
    if (!error) return filas
    // 42703 = la columna no existe en esta tabla: probar con la siguiente.
    if (error.code !== '42703') throw new Error(`${tabla}: ${error.message}`)
  }
  throw new Error(`${tabla}: no tiene columna id ni edition_id para ordenar`)
}

// El bucket se organiza en carpetas por edición: <edition_id>/<uuid>.jpg
async function listarFotos() {
  const rutas = []
  const { data: carpetas, error } = await supabase.storage.from(BUCKET_FOTOS).list('', { limit: 1000 })
  if (error) throw new Error(`Storage: ${error.message}`)
  for (const carpeta of carpetas ?? []) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error: errLista } = await supabase.storage
        .from(BUCKET_FOTOS)
        .list(carpeta.name, { limit: 1000, offset })
      if (errLista) throw new Error(`Storage ${carpeta.name}: ${errLista.message}`)
      rutas.push(...(data ?? []).map((o) => `${carpeta.name}/${o.name}`))
      if (!data || data.length < 1000) break
    }
  }
  return rutas
}

async function descargarFotos(rutas, dirDestino) {
  let ok = 0
  for (const ruta of rutas) {
    const { data, error } = await supabase.storage.from(BUCKET_FOTOS).download(ruta)
    if (error) {
      console.warn(`  ⚠ no se pudo bajar ${ruta}: ${error.message}`)
      continue
    }
    const destino = path.join(dirDestino, ruta)
    await mkdir(path.dirname(destino), { recursive: true })
    await writeFile(destino, Buffer.from(await data.arrayBuffer()))
    ok++
  }
  return ok
}

// Sello de fecha en hora de México, no la de la laptop: es la hora del evento.
function sello() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const v = (t) => partes.find((p) => p.type === t)?.value
  return `${v('year')}-${v('month')}-${v('day')}_${v('hour')}${v('minute')}`
}

async function main() {
  const stamp = sello()
  const dir = path.join(DIR_RESPALDOS, `respaldo-${stamp}`)
  await mkdir(dir, { recursive: true })

  const tablas = await leerTablas()
  console.log(`Respaldando ${tablas.length} tablas de ${new URL(url).hostname}…`)

  const datos = {}
  const conteos = {}
  for (const tabla of tablas) {
    datos[tabla] = await leerTabla(tabla)
    conteos[tabla] = datos[tabla].length
    console.log(`  ${tabla.padEnd(24)} ${conteos[tabla]}`)
  }

  const fotos = await listarFotos()
  console.log(`  fotos en el bucket       ${fotos.length}`)

  const respaldo = {
    generado: new Date().toISOString(),
    proyecto: new URL(url).hostname,
    conteos,
    fotos,
    tablas: datos,
  }
  const archivo = path.join(dir, 'datos.json')
  await writeFile(archivo, JSON.stringify(respaldo, null, 2))
  console.log(`\n✓ Datos guardados en ${archivo}`)

  if (conFotos) {
    const ok = await descargarFotos(fotos, path.join(dir, 'fotos'))
    console.log(`✓ ${ok} de ${fotos.length} fotos descargadas en ${path.join(dir, 'fotos')}`)
  }

  console.log('\nGuarda esta carpeta fuera de la laptop (USB o nube): contiene datos personales.')
}

main().catch((err) => {
  console.error(`\n✗ El respaldo falló: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
