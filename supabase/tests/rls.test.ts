// Tests de RLS y triggers de seguridad (Fase 10, Bloque 2).
//
// Aplica TODAS las migraciones de supabase/migrations sobre PGlite (Postgres
// compilado a WASM, corre en memoria dentro de Node) con stubs mínimos de lo
// que Supabase pone por fuera: el esquema auth, storage, los roles
// anon/authenticated y la publicación de realtime. Después suplanta a cada rol
// con request.jwt.claims, que es exactamente lo que hace PostgREST.
//
// Nunca toca la BD remota: no hay red. Prueba directa de las reglas 2, 4, 5 y
// 7 de CLAUDE.md y de la migración 20261001000000_security_hardening.
//
// Los casos corren EN ORDEN y comparten la BD (vitest ejecuta los `it` de un
// archivo en secuencia): algunos cierran rondas o etapas que los siguientes
// dan por cerradas.

import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const MIGRACIONES = path.resolve(__dirname, '../migrations')

const STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}',
  raw_app_meta_data jsonb default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub', '')::uuid $$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role' $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create publication supabase_realtime;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`

const uuid = (prefijo: number, n: number) =>
  `${String(prefijo).padStart(8, '0')}-0000-0000-0000-${String(n).padStart(12, '0')}`

const ENC = uuid(1, 1)
const JUEZ = uuid(1, 2)
const JUEZ2 = uuid(1, 3)
const DIR = uuid(1, 4)
const INACT = uuid(1, 5)
const ANUN = uuid(1, 6)
const ED = uuid(2, 1)
const P1 = uuid(3, 1)
const P2 = uuid(3, 2)
const P3 = uuid(3, 3)
const S1 = uuid(4, 1)
const S2 = uuid(4, 2)
const C1 = uuid(5, 1)
const C2 = uuid(5, 2)
const R1 = uuid(6, 1)
const R2 = uuid(6, 2)
const T1 = uuid(7, 1)

const USUARIOS: [string, string][] = [
  [ENC, 'encargado'],
  [JUEZ, 'juez'],
  [JUEZ2, 'juez'],
  [DIR, 'director'],
  [INACT, 'juez'],
  [ANUN, 'anunciador'],
]

let db: PGlite

interface Resultado {
  filas: Record<string, unknown>[]
  afectadas: number
  error: string | null
}

/** Ejecuta como el usuario dado (null = postgres/service_role, sin JWT). */
async function como(uid: string | null, sql: string, params: unknown[] = []): Promise<Resultado> {
  await db.query('reset role')
  const claims = uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : ''
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims])
  if (uid) await db.query('set role authenticated')
  try {
    const r = await db.query<Record<string, unknown>>(sql, params)
    return { filas: r.rows, afectadas: r.affectedRows ?? 0, error: null }
  } catch (e) {
    return { filas: [], afectadas: 0, error: e instanceof Error ? e.message : String(e) }
  } finally {
    await db.query('reset role')
  }
}

const UPSERT_SCORE = `
  insert into judge_scores (judge_id, participant_id, challenge_id, stage_id, score)
  values ($1, $2, $3, $4, $5)
  on conflict (judge_id, participant_id, challenge_id) do update set score = excluded.score`

beforeAll(async () => {
  db = new PGlite()
  await db.exec(STUBS)
  for (const archivo of readdirSync(MIGRACIONES).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(MIGRACIONES, archivo), 'utf8'))
  }

  for (const [id, rol] of USUARIOS) {
    await db.query(
      `insert into auth.users (id, email, raw_app_meta_data) values ($1::uuid, $1::text || '@x.mx', jsonb_build_object('role', $2::text))`,
      [id, rol],
    )
  }
  // El rol se fija también a mano: así el seed no depende de handle_new_user y,
  // si una migración lo rompe, falla su test y no todo el archivo.
  for (const [id, rol] of USUARIOS) {
    await db.query('update profiles set role = $2::app_role where id = $1', [id, rol])
  }
  await db.query('update profiles set active = false where id = $1', [INACT])

  await db.exec(`
    insert into editions (id, name, year, is_active) values ('${ED}', 'E', 2026, true);
    insert into participants (id, edition_id, sash_number, full_name, region) values
      ('${P1}', '${ED}', 1, 'Ana', 'X'), ('${P2}', '${ED}', 2, 'Bea', 'X'), ('${P3}', '${ED}', 3, 'Cira', 'X');
    insert into stages (id, edition_id, slug, name, order_num, cupo) values
      ('${S1}', '${ED}', 's1', 'S1', 1, 18), ('${S2}', '${ED}', 's2', 'S2', 2, 16);
    insert into challenges (id, edition_id, name, order_num) values
      ('${C1}', '${ED}', 'Pasarela', 1), ('${C2}', '${ED}', 'Entrevista', 2);
    insert into stage_participants (stage_id, participant_id) values
      ('${S1}', '${P1}'), ('${S1}', '${P2}'), ('${S2}', '${P1}');
    insert into judge_rounds (id, stage_id) values ('${R1}', '${S1}'), ('${R2}', '${S2}');
    insert into judge_round_challenges (round_id, challenge_id) values
      ('${R1}', '${C1}'), ('${R2}', '${C1}'), ('${R2}', '${C2}');
    insert into judge_round_judges (round_id, judge_id) values
      ('${R1}', '${JUEZ}'), ('${R1}', '${INACT}'), ('${R2}', '${JUEZ2}');
    insert into challenge_scores (challenge_id, participant_id, score) values ('${C1}', '${P1}', 8)
      on conflict (challenge_id, participant_id) do update set score = 8;
    insert into observations (edition_id, participant_id, author_id, body) values ('${ED}', '${P1}', '${DIR}', 'privada');
    insert into titles (id, edition_id, name, order_num, kind) values ('${T1}', '${ED}', 'Miss México', 1, 'titulo');
    insert into title_assignments (edition_id, title_id, participant_id) values ('${ED}', '${T1}', '${P1}');
  `)
}, 60_000)

describe('profiles: nadie se cambia el rol a sí mismo', () => {
  // Tras cada caso se restauran los perfiles: si la protección se rompe, el
  // juez que se hizo encargado no contamina a los demás describe.
  afterEach(async () => {
    for (const [id, rol] of USUARIOS) {
      await como(null, `update profiles set role = $2::app_role, active = $3, email = $1::text || '@x.mx' where id = $1`, [id, rol, id !== INACT])
    }
  })

  it('un juez NO puede hacerse encargado', async () => {
    const r = await como(JUEZ, `update profiles set role = 'encargado' where id = $1`, [JUEZ])
    expect(r.error).toContain('Solo el encargado')
  })

  it('un juez NO puede reactivarse ni cambiarse el correo', async () => {
    expect((await como(JUEZ, `update profiles set active = false where id = $1`, [JUEZ])).error).not.toBeNull()
    expect((await como(JUEZ, `update profiles set email = 'x@y.mx' where id = $1`, [JUEZ])).error).not.toBeNull()
  })

  it('un juez SÍ puede cambiar su nombre', async () => {
    const r = await como(JUEZ, `update profiles set full_name = 'Nuevo' where id = $1`, [JUEZ])
    expect(r.error).toBeNull()
    expect(r.afectadas).toBe(1)
  })

  it('el encargado SÍ cambia roles; la service_role también', async () => {
    expect((await como(ENC, `update profiles set role = 'director' where id = $1`, [JUEZ2])).afectadas).toBe(1)
    expect((await como(null, `update profiles set role = 'juez' where id = $1`, [JUEZ2])).error).toBeNull()
  })
})

describe('usuarios desactivados', () => {
  it('auth_role() de un inactivo es null', async () => {
    const r = await como(INACT, 'select public.auth_role() as rol')
    expect(r.filas[0].rol).toBeNull()
  })

  it('un juez inactivo asignado a la ronda NO puede calificar', async () => {
    const r = await como(INACT, UPSERT_SCORE, [INACT, P1, C1, S1, 5])
    expect(r.error).toContain('row-level security')
  })
})

describe('alta de usuarios: el rol no lo decide el cliente', () => {
  it('signUp con role en user_metadata queda SIN rol', async () => {
    const id = uuid(1, 90)
    await como(null, `insert into auth.users (id, email, raw_user_meta_data) values ($1, 'h@x.mx', '{"role":"encargado","full_name":"H"}')`, [id])
    const r = await como(null, 'select role, full_name from profiles where id = $1', [id])
    expect(r.filas[0]).toEqual({ role: null, full_name: 'H' })
  })

  it('la admin API (app_metadata) SÍ asigna rol', async () => {
    const id = uuid(1, 91)
    await como(null, `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'a@x.mx', '{"role":"anunciador"}')`, [id])
    const r = await como(null, 'select role from profiles where id = $1', [id])
    expect(r.filas[0].role).toBe('anunciador')
  })
})

describe('judge_scores: el juez solo califica dentro de su ronda', () => {
  it('dentro de su ronda: se guarda', async () => {
    expect((await como(JUEZ, UPSERT_SCORE, [JUEZ, P1, C1, S1, 7])).afectadas).toBe(1)
  })

  it.each([
    ['participante fuera de la etapa', P3, C1, S1],
    ['reto fuera de la ronda', P1, C2, S1],
    ['ronda a la que no está asignado', P1, C1, S2],
  ])('%s: se descarta sin error', async (_caso, participante, reto, etapa) => {
    const r = await como(JUEZ, UPSERT_SCORE, [JUEZ, participante, reto, etapa, 7])
    expect(r.error).toBeNull()
    expect(r.afectadas).toBe(0)
  })

  it('un lote mixto deja pasar las válidas y no traba el envío', async () => {
    const r = await como(
      JUEZ,
      `insert into judge_scores (judge_id, participant_id, challenge_id, stage_id, score) values
         ($1, $2, $4, $5, 9), ($1, $3, $4, $5, 8), ($1, $6, $4, $5, 6)
       on conflict (judge_id, participant_id, challenge_id) do update set score = excluded.score`,
      [JUEZ, P1, P2, C1, S1, P3],
    )
    expect(r.error).toBeNull()
    expect(r.afectadas).toBe(2)
  })

  it('el director no puede escribir calificaciones de jueces', async () => {
    expect((await como(DIR, UPSERT_SCORE, [DIR, P1, C1, S1, 5])).error).not.toBeNull()
  })
})

describe('aislamiento de jueces (regla 5) y privacidad (regla 4)', () => {
  beforeAll(async () => {
    await como(JUEZ2, UPSERT_SCORE, [JUEZ2, P1, C1, S2, 6])
  })

  it('un juez solo ve sus propias calificaciones', async () => {
    const r = await como(JUEZ, 'select distinct judge_id from judge_scores')
    expect(r.filas).toEqual([{ judge_id: JUEZ }])
  })

  it('un juez no ve los puntos del encargado', async () => {
    expect((await como(JUEZ, 'select * from challenge_scores')).filas).toHaveLength(0)
  })

  it('un juez no puede capturar puntos del encargado', async () => {
    const r = await como(JUEZ, 'insert into challenge_scores (challenge_id, participant_id, score) values ($1, $2, 5)', [C2, P1])
    expect(r.error).not.toBeNull()
  })

  it('juez y anunciador no ven observaciones; el director sí', async () => {
    expect((await como(JUEZ, 'select * from observations')).filas).toHaveLength(0)
    expect((await como(ANUN, 'select * from observations')).filas).toHaveLength(0)
    expect((await como(DIR, 'select * from observations')).filas).toHaveLength(1)
  })

  it('un juez no lee el audit log', async () => {
    expect((await como(JUEZ, 'select * from audit_log')).filas).toHaveLength(0)
  })

  it('un juez solo ve sus rondas y los retos de ellas (M1)', async () => {
    expect((await como(JUEZ, 'select id from judge_rounds')).filas).toEqual([{ id: R1 }])
    const retos = await como(JUEZ, 'select round_id from judge_round_challenges')
    expect(retos.filas.every((f) => f.round_id === R1)).toBe(true)
    expect((await como(DIR, 'select id from judge_rounds')).filas).toHaveLength(2)
  })
})

describe('anunciador: solo lo publicado', () => {
  it('no ve asignaciones de una edición sin publicar', async () => {
    expect((await como(ANUN, 'select * from title_assignments')).filas).toHaveLength(0)
  })

  it('las ve en cuanto el director publica', async () => {
    const pub = await como(DIR, 'insert into edition_publications (edition_id, published) values ($1, true)', [ED])
    expect(pub.error).toBeNull()
    expect((await como(ANUN, 'select * from title_assignments')).filas).toHaveLength(1)
  })
})

describe('cierres (reglas 1, 2 y 7)', () => {
  it('ronda cerrada: lanza el error que congela al cliente', async () => {
    await como(ENC, `update judge_rounds set status = 'cerrada' where id = $1`, [R1])
    const r = await como(JUEZ, UPSERT_SCORE, [JUEZ, P1, C1, S1, 4])
    expect(r.error).toContain('ronda de jueces')
  })

  it('una ronda cerrada no se reabre', async () => {
    const r = await como(ENC, `update judge_rounds set status = 'abierta' where id = $1`, [R1])
    expect(r.error).not.toBeNull()
  })

  it('solo el encargado cierra una etapa', async () => {
    expect((await como(DIR, 'select public.cerrar_etapa($1)', [S2])).error).not.toBeNull()
    expect((await como(ENC, 'select public.cerrar_etapa($1)', [S2])).error).toBeNull()
  })

  it('al cerrar la etapa se graba el snapshot y se cierra su ronda', async () => {
    const snap = await como(null, 'select count(*)::int as n from stage_snapshots where stage_id = $1', [S2])
    expect(snap.filas[0].n).toBe(1)
    const ronda = await como(null, 'select status from judge_rounds where id = $1', [R2])
    expect(ronda.filas[0].status).toBe('cerrada')
  })

  it('el snapshot no se modifica ni lo lee un juez', async () => {
    expect((await como(null, `update stage_snapshots set snapshot = '{}' where stage_id = $1`, [S2])).error).not.toBeNull()
    expect((await como(JUEZ2, 'select * from stage_snapshots')).filas).toHaveLength(0)
  })

  it('con la etapa cerrada no se califica ni se reabre', async () => {
    expect((await como(JUEZ2, UPSERT_SCORE, [JUEZ2, P1, C2, S2, 5])).error).not.toBeNull()
    expect((await como(ENC, `update stages set status = 'abierta' where id = $1`, [S2])).error).not.toBeNull()
  })
})
