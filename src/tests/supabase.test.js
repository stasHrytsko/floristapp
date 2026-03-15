import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

describe('supabase client', () => {
  it('создаётся без ошибок', async () => {
    const { supabase } = await import('../lib/supabase.js')
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
