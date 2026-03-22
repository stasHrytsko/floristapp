import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSessionStore } from '../../bot/lib/sessionStore.js'

const TTL = 10 * 60 * 1000

describe('createSessionStore', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('хранит и возвращает данные сессии', () => {
    const { getSession, setSession } = createSessionStore(TTL)
    setSession(1, { step: 'TEST' })
    expect(getSession(1)).toEqual({ step: 'TEST' })
  })

  it('возвращает undefined для несуществующей сессии', () => {
    const { getSession } = createSessionStore(TTL)
    expect(getSession(999)).toBeUndefined()
  })

  it('clearSession удаляет сессию', () => {
    const { getSession, setSession, clearSession } = createSessionStore(TTL)
    setSession(1, { step: 'TEST' })
    clearSession(1)
    expect(getSession(1)).toBeUndefined()
  })

  it('сессия помечается истёкшей после TTL', () => {
    const { getSession, isExpired, setSession } = createSessionStore(TTL)
    setSession(1, { step: 'TEST' })
    expect(getSession(1)).toEqual({ step: 'TEST' })
    vi.advanceTimersByTime(TTL + 1)
    expect(getSession(1)).toBeUndefined()
    expect(isExpired(1)).toBe(true)
  })

  it('setSession сбрасывает таймер истечения', () => {
    const { getSession, setSession, isExpired } = createSessionStore(TTL)
    setSession(1, { step: 'A' })
    vi.advanceTimersByTime(TTL / 2)
    setSession(1, { step: 'B' }) // сброс таймера
    vi.advanceTimersByTime(TTL / 2 + 1) // изначальный таймер бы истёк
    expect(getSession(1)).toEqual({ step: 'B' })
    expect(isExpired(1)).toBe(false)
  })

  it('clearSession отменяет таймер — сессия не помечается истёкшей', () => {
    const { getSession, setSession, clearSession, isExpired } = createSessionStore(TTL)
    setSession(1, { step: 'TEST' })
    clearSession(1)
    vi.advanceTimersByTime(TTL + 1)
    expect(getSession(1)).toBeUndefined()
    expect(isExpired(1)).toBe(false)
  })

  it('isExpired возвращает false для несуществующей сессии', () => {
    const { isExpired } = createSessionStore(TTL)
    expect(isExpired(42)).toBe(false)
  })

  it('разные userId хранятся независимо', () => {
    const { getSession, setSession } = createSessionStore(TTL)
    setSession(1, { step: 'A' })
    setSession(2, { step: 'B' })
    expect(getSession(1)).toEqual({ step: 'A' })
    expect(getSession(2)).toEqual({ step: 'B' })
  })
})
