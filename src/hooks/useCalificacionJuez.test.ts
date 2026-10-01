// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RondaActiva, ScoreJuezInicial } from './useRondaJuez'

// La cola offline del juez es la pieza más delicada del evento (regla 8): una
// nota que se pierde no se recupera, y una que se manda a nombre de otro juez
// altera el resultado. Caja negra: se renderiza el hook tal cual, con
// localStorage real (jsdom) y un supabase falso que registra los upserts.

const upserts: { filas: Record<string, unknown>[] }[] = []
let respuestaUpsert: { error: unknown } = { error: null }
let usuarioActual: { id: string } | null = { id: 'juez-a' }

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert: async (filas: Record<string, unknown>[]) => {
        upserts.push({ filas })
        return respuestaUpsert
      },
    }),
  },
}))

vi.mock('../stores/useAppStore', () => ({
  useAppStore: (selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: usuarioActual }),
}))

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

const { useCalificacionJuez } = await import('./useCalificacionJuez')

const RONDA: RondaActiva = {
  id: 'ronda-1',
  stage_id: 'etapa-1',
  stage_name: 'Top 16',
  status: 'abierta',
  closed_at: null,
}

function ponerRed(enLinea: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: enLinea })
  window.dispatchEvent(new Event(enLinea ? 'online' : 'offline'))
}

// Referencia estable, como en la app (viene memoizada de useRondaJuez): un `[]`
// literal sería un arreglo nuevo en cada render y redispararía el sembrado.
const SIN_SCORES_PREVIOS: ScoreJuezInicial[] = []

const montar = (ronda: RondaActiva = RONDA) =>
  renderHook(({ r }) => useCalificacionJuez(r, SIN_SCORES_PREVIOS), { initialProps: { r: ronda } })

beforeEach(() => {
  localStorage.clear()
  upserts.length = 0
  respuestaUpsert = { error: null }
  usuarioActual = { id: 'juez-a' }
  ponerRed(true)
})

// Sin `globals` en vitest, testing-library no desmonta solo: un hook de un
// test anterior seguiría escuchando 'online' y mandando su cola.
afterEach(() => {
  cleanup()
})

describe('sin red', () => {
  it('la nota queda pendiente en localStorage y no se intenta enviar', async () => {
    ponerRed(false)
    const { result } = montar()
    await act(async () => result.current.setScore('p1', 'c1', 8))

    expect(upserts).toHaveLength(0)
    expect(result.current.estado).toBe('offline')
    expect(result.current.pendientes).toBe(1)
    const guardado = JSON.parse(localStorage.getItem('juez_scores_juez-a_ronda-1') ?? '{}')
    expect(guardado['p1:c1']).toEqual({ score: 8, synced: false })
  })

  it('sobrevive a una recarga de la página', async () => {
    ponerRed(false)
    const primera = montar()
    await act(async () => primera.result.current.setScore('p1', 'c1', 8))
    primera.unmount()

    const { result } = montar()
    expect(result.current.getScore('p1', 'c1')).toBe(8)
    expect(result.current.pendientes).toBe(1)
  })

  it('al reconectar manda todo en UN lote, a nombre del juez y con su etapa', async () => {
    ponerRed(false)
    const { result } = montar()
    await act(async () => {
      result.current.setScore('p1', 'c1', 8)
      result.current.setScore('p2', 'c1', 7)
    })

    await act(async () => ponerRed(true))

    expect(upserts).toHaveLength(1)
    expect(upserts[0].filas).toEqual([
      { judge_id: 'juez-a', participant_id: 'p1', challenge_id: 'c1', stage_id: 'etapa-1', score: 8 },
      { judge_id: 'juez-a', participant_id: 'p2', challenge_id: 'c1', stage_id: 'etapa-1', score: 7 },
    ])
    expect(result.current.pendientes).toBe(0)
    expect(result.current.estado).toBe('sincronizado')
  })
})

describe('con red', () => {
  it('la nota recién capturada se envía en el acto, sin esperar al reintento', async () => {
    const { result } = montar()
    await act(async () => result.current.setScore('p1', 'c1', 8))

    expect(upserts).toHaveLength(1)
    expect(upserts[0].filas).toEqual([
      { judge_id: 'juez-a', participant_id: 'p1', challenge_id: 'c1', stage_id: 'etapa-1', score: 8 },
    ])
    expect(result.current.estado).toBe('sincronizado')
  })
})

describe('tableta compartida', () => {
  it('el segundo juez no ve ni envía lo que dejó pendiente el primero', async () => {
    ponerRed(false)
    const deA = montar()
    await act(async () => deA.result.current.setScore('p1', 'c1', 9))
    deA.unmount()

    usuarioActual = { id: 'juez-b' }
    ponerRed(true)
    const { result } = montar()
    await act(async () => result.current.syncNow())

    expect(result.current.getScore('p1', 'c1')).toBeUndefined()
    expect(result.current.pendientes).toBe(0)
    expect(upserts).toHaveLength(0)
    // La nota de A sigue en su cola, para cuando A vuelva a entrar.
    expect(localStorage.getItem('juez_scores_juez-a_ronda-1')).toContain('"score":9')
  })
})

describe('rechazos del servidor', () => {
  it('ronda cerrada en caliente: congela la captura y deja de reintentar', async () => {
    respuestaUpsert = {
      error: { code: 'P0001', message: 'La ronda de jueces esta cerrada: no se pueden modificar calificaciones' },
    }
    const { result } = montar()
    await act(async () => result.current.setScore('p1', 'c1', 6))

    expect(result.current.rondaBloqueada).toBe(true)
    expect(result.current.estado).toBe('bloqueado')

    await act(async () => result.current.syncNow())
    expect(upserts).toHaveLength(1)
  })

  it('error transitorio: conserva la nota y la reintenta', async () => {
    respuestaUpsert = { error: { code: '08006', message: 'connection failure' } }
    const { result } = montar()
    await act(async () => result.current.setScore('p1', 'c1', 6))

    expect(result.current.rondaBloqueada).toBe(false)
    expect(result.current.pendientes).toBe(1)

    respuestaUpsert = { error: null }
    await act(async () => result.current.syncNow())
    expect(upserts).toHaveLength(2)
    expect(result.current.pendientes).toBe(0)
  })
})
