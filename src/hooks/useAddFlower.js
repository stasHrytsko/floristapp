import { supabase } from '../lib/supabase'

export function useAddFlower() {
  async function addFlower(name, threshold = 5) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Введите название')

    const { data, error } = await supabase
      .from('flowers')
      .insert({ name: trimmed, low_stock_threshold: threshold })
      .select('id, name, low_stock_threshold')
      .single()
    if (error) throw error
    return data
  }

  async function updateThreshold(flowerId, threshold) {
    const { error } = await supabase
      .from('flowers')
      .update({ low_stock_threshold: threshold })
      .eq('id', flowerId)
    if (error) throw error
  }

  return { addFlower, updateThreshold }
}
