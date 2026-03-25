import { supabase } from '../lib/supabase'

export function useWriteOff() {
  async function createWriteOff({ flowerId, quantity }) {
    const { error } = await supabase.from('movements').insert({
      movement_type: 'списание',
      flower_id: flowerId,
      quantity,
    })
    if (error) throw error
  }

  return { createWriteOff }
}
