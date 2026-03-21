import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useNewOrder } from '../hooks/useNewOrder'

vi.mock('../lib/supabase', () => {
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    in: vi.fn(),
    single: vi.fn(),
  }
  // make every method return chain for chaining
  Object.keys(chain).forEach((k) => chain[k].mockReturnValue(chain))
  return { supabase: chain }
})

import { supabase } from '../lib/supabase'

const baseOrder = {
  clientName: 'Анна',
  clientPhone: null,
  readyAt: '2026-03-25',
  deliveryType: 'самовывоз',
  address: '',
  items: [{ flowerId: 'f1', quantity: 3 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.from.mockReturnValue(supabase)
  supabase.select.mockReturnValue(supabase)
  supabase.insert.mockReturnValue(supabase)
  supabase.in.mockReturnValue(supabase)
  supabase.single.mockReturnValue(supabase)
})

describe('useNewOrder — pre-check', () => {
  it('бросает ошибку если quantity > available', async () => {
    // pre-check stock fetch returns insufficient stock
    supabase.in.mockResolvedValueOnce({
      data: [{ flower_id: 'f1', name: 'Роза', available: 2 }],
      error: null,
    })

    const { result } = renderHook(() => useNewOrder())
    await expect(result.current.saveOrder(baseOrder)).rejects.toThrow('На складе только 2 роза')
  })

  it('сообщение об ошибке содержит количество и название', async () => {
    supabase.in.mockResolvedValueOnce({
      data: [{ flower_id: 'f1', name: 'Тюльпан', available: 1 }],
      error: null,
    })

    const { result } = renderHook(() => useNewOrder())
    await expect(result.current.saveOrder(baseOrder)).rejects.toThrow('На складе только 1')
  })

  it('бросает ошибку если цветок не найден в stock', async () => {
    supabase.in.mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(() => useNewOrder())
    await expect(result.current.saveOrder(baseOrder)).rejects.toThrow('На складе только 0')
  })
})
