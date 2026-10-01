import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { StoreApi } from 'zustand/vanilla'
import type { Tables } from '../../types/database'

// El borrador del director es lo que termina proyectado en el escenario: un
// diff mal calculado manda al anunciador una asignación distinta a la que ve
// el director. Aquí se prueba la lógica del slice con un supabase falso que
// solo registra lo que se le pide.

interface Llamada {
  tabla: string
  op: 'delete' | 'insert' | 'upsert' | 'select'
  datos?: unknown
}

const llamadas: Llamada[] = []
let filasAsignaciones: Partial<Tables<'title_assignments'>>[] = []
/** Si se define, cada operación de escritura espera a esta promesa. */
let pausa: Promise<void> | null = null

function builder(tabla: string) {
  const resolver = async (op: Llamada['op'], datos?: unknown) => {
    llamadas.push({ tabla, op, datos })
    if (pausa && op !== 'select') await pausa
    if (op === 'select') return { data: filasAsignaciones, error: null }
    return { data: null, error: null }
  }
  return {
    select: () => ({ eq: () => resolver('select') }),
    delete: () => ({ in: (_col: string, ids: string[]) => resolver('delete', ids) }),
    insert: (filas: unknown) => resolver('insert', filas),
    upsert: (filas: unknown) => resolver('upsert', filas),
  }
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (tabla: string) => builder(tabla),
    auth: { getSession: async () => ({ data: { session: { user: { id: 'director-1' } } } }) },
  },
}))

const { createDirectorSlice } = await import('./directorSlice')
type Estado = ReturnType<typeof createDirectorSlice>

const titulo = (id: string, orden: number) =>
  ({ id, edition_id: 'ed', name: id, order_num: orden, kind: 'titulo', created_at: '' }) as Tables<'titles'>

let store: StoreApi<Estado>

/** Estado como si se acabara de cargar la edición desde la BD. */
function cargar(ranking: string[], asignaciones: Record<string, string | null>) {
  const filas = Object.entries(asignaciones)
    .filter(([, pid]) => pid !== null)
    .map(([tid, pid]) => ({ id: `fila-${tid}`, edition_id: 'ed', title_id: tid, participant_id: pid })) as Tables<'title_assignments'>[]
  store.setState({
    directorEdicionId: 'ed',
    directorTitulos: Object.keys(asignaciones).map((id, i) => titulo(id, i + 1)),
    directorRanking: [...ranking],
    directorRankingGuardado: [...ranking],
    directorAsignaciones: { ...asignaciones },
    directorAsignacionesGuardadas: { ...asignaciones },
    directorAsignacionesFilas: filas,
    hayCambiosSinGuardar: false,
  })
  filasAsignaciones = filas
}

beforeEach(() => {
  llamadas.length = 0
  pausa = null
  store = createStore<Estado>()((...a) => createDirectorSlice(...a))
})

describe('borrador: cambios locales', () => {
  it('reordenar marca cambios; volver al orden original los quita', () => {
    cargar(['a', 'b', 'c'], {})
    store.getState().reordenarRanking('c', 0)
    expect(store.getState().directorRanking).toEqual(['c', 'a', 'b'])
    expect(store.getState().hayCambiosSinGuardar).toBe(true)
    store.getState().reordenarRanking('c', 2)
    expect(store.getState().hayCambiosSinGuardar).toBe(false)
  })

  it('una participante solo ocupa un título: asignarla a otro libera el anterior', () => {
    cargar(['a', 'b'], { t1: 'a', t2: null })
    store.getState().asignarTitulo('t2', 'a')
    expect(store.getState().directorAsignaciones).toEqual({ t1: null, t2: 'a' })
  })

  it('descartar vuelve al último estado guardado', () => {
    cargar(['a', 'b'], { t1: 'a' })
    store.getState().reordenarRanking('b', 0)
    store.getState().quitarTitulo('t1')
    store.getState().descartarCambios()
    const s = store.getState()
    expect(s.directorRanking).toEqual(['a', 'b'])
    expect(s.directorAsignaciones).toEqual({ t1: 'a' })
    expect(s.hayCambiosSinGuardar).toBe(false)
  })
})

describe('guardarDirector: diff en una tanda', () => {
  it('sin cambios no escribe nada en asignaciones ni ranking', async () => {
    cargar(['a', 'b'], { t1: 'a' })
    await store.getState().guardarDirector()
    expect(llamadas.filter((l) => l.op !== 'select')).toEqual([])
  })

  it('intercambiar dos títulos borra ambas filas ANTES de insertar (unique por participante)', async () => {
    cargar(['a', 'b'], { t1: 'a', t2: 'b' })
    store.getState().asignarTitulo('t1', 'b')
    store.getState().asignarTitulo('t2', 'a')
    await store.getState().guardarDirector()

    const escrituras = llamadas.filter((l) => l.tabla === 'title_assignments' && l.op !== 'select')
    expect(escrituras.map((l) => l.op)).toEqual(['delete', 'insert'])
    expect(escrituras[0].datos).toEqual(['fila-t1', 'fila-t2'])
    expect(escrituras[1].datos).toEqual([
      { edition_id: 'ed', title_id: 't1', participant_id: 'b', assigned_by: 'director-1' },
      { edition_id: 'ed', title_id: 't2', participant_id: 'a', assigned_by: 'director-1' },
    ])
  })

  it('quitar un título solo borra; no inserta nada', async () => {
    cargar(['a'], { t1: 'a' })
    store.getState().quitarTitulo('t1')
    await store.getState().guardarDirector()
    const escrituras = llamadas.filter((l) => l.tabla === 'title_assignments' && l.op !== 'select')
    expect(escrituras.map((l) => l.op)).toEqual(['delete'])
  })

  it('el ranking se manda completo con posiciones desde 1', async () => {
    cargar(['a', 'b', 'c'], {})
    store.getState().reordenarRanking('c', 0)
    await store.getState().guardarDirector()
    const upsert = llamadas.find((l) => l.tabla === 'manual_rankings')
    expect(upsert?.datos).toEqual([
      { edition_id: 'ed', participant_id: 'c', position: 1, updated_by: 'director-1' },
      { edition_id: 'ed', participant_id: 'a', position: 2, updated_by: 'director-1' },
      { edition_id: 'ed', participant_id: 'b', position: 3, updated_by: 'director-1' },
    ])
    expect(store.getState().hayCambiosSinGuardar).toBe(false)
  })

  it('un cambio hecho MIENTRAS se guarda queda pendiente, no se da por guardado', async () => {
    cargar(['a', 'b'], { t1: null })
    store.getState().asignarTitulo('t1', 'a')

    let soltar = () => {}
    pausa = new Promise<void>((r) => (soltar = r))
    const guardado = store.getState().guardarDirector()
    await Promise.resolve()

    // El director sigue trabajando con la red lenta.
    store.getState().reordenarRanking('b', 0)
    soltar()
    await guardado

    const s = store.getState()
    expect(s.directorRanking).toEqual(['b', 'a'])
    expect(s.directorRankingGuardado).toEqual(['a', 'b'])
    expect(s.hayCambiosSinGuardar).toBe(true)
  })
})
