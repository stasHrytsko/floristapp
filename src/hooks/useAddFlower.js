import { supabase } from '../lib/supabase'

export function useAddFlower() {
  async function addFlower(name) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Введите название')

    const { data, error } = await supabase
      .from('flowers')
      .insert({ name: trimmed })
      .select('id, name')
      .single()
    if (error) throw error
    return data
  }

  return { addFlower }
}
