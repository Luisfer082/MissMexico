// Respaldo de las FOTOS de participantes (Fase 10, Bloque 4).
//
// Los DATOS se respaldan con el botón "Respaldo" del panel del encargado
// (src/hooks/useRespaldo.ts), que es la única fuente de ese respaldo. Lo que el
// navegador no puede hacer sin una librería de ZIP es bajar las fotos, y para
// eso existe este script. Es SOLO LECTURA.
//
// Uso:  npm run respaldo:fotos
//
// Listar el bucket exige sesión desde la migración 20261013000000, así que usa
// la service_role key, en `.env.respaldo` (git lo ignora por el patrón `.env.*`):
//   SUPABASE_SERVICE_ROLE_KEY=...
// La service_role es admin total: NUNCA va en `.env` (que lee Vite y podría
// acabar en el bundle) ni se comparte. Se saca de Supabase → Project Settings
// → API Keys.
//
// Es un script de consola, no código de la app: aquí console.log es la salida.

import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BUCKET_FOTOS = 'fotos-participantes'
const DIR_RESPALDOS = 'respaldos'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Faltan variables: VITE_SUPABASE_URL (en .env) y SUPABASE_SERVICE_ROLE_KEY (en .env.respaldo).',
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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
  const dir = path.join(DIR_RESPALDOS, `fotos-${sello()}`)
  const rutas = await listarFotos()
  console.log(`Descargando ${rutas.length} fotos de ${new URL(url).hostname}…`)

  let ok = 0
  for (const ruta of rutas) {
    const { data, error } = await supabase.storage.from(BUCKET_FOTOS).download(ruta)
    if (error) {
      console.warn(`  ⚠ no se pudo bajar ${ruta}: ${error.message}`)
      continue
    }
    const destino = path.join(dir, ruta)
    await mkdir(path.dirname(destino), { recursive: true })
    await writeFile(destino, Buffer.from(await data.arrayBuffer()))
    ok++
  }

  console.log(`\n✓ ${ok} de ${rutas.length} fotos guardadas en ${dir}`)
  console.log('Guarda esta carpeta fuera de la laptop (USB o nube).')
  if (ok < rutas.length) process.exit(1)
}

main().catch((err) => {
  console.error(`\n✗ El respaldo de fotos falló: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
