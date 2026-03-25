import { supabase } from '../lib/supabase'

export function useWriteOff() {
  async function createWriteOff({ flowerId, quantity, comment }) {
    const { data: defect, error: dErr } = await supabase
      .from('defects')
      .insert({
        flower_id: flowerId,
        quantity,
        defect_type: 'списание',
        resolution: 'списание',
        comment: comment || null,
      })
      .select('id')
      .single()
    if (dErr) throw dErr

    const { error: mErr } = await supabase.from('movements').insert({
      movement_type: 'списание',
      flower_id: flowerId,
      defect_id: defect.id,
      quantity,
    })
    if (mErr) throw mErr
  }

  return { createWriteOff }
}
