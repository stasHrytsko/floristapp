import { supabase } from '../lib/supabase'

export function useDefect() {
  async function markDefect({ deliveryItem, supplierId, deliveredAt, defectQty, comment }) {
    const flowerId = deliveryItem.flowers?.id

    let batchId = deliveryItem.batch_id
    if (!batchId) {
      const goodQty = Math.max(0, deliveryItem.quantity - defectQty)

      const { data: batch, error: bErr } = await supabase
        .from('batches')
        .insert({
          supplier_id: supplierId,
          flower_id: flowerId,
          quantity: goodQty,
          delivered_at: deliveredAt,
        })
        .select('id')
        .single()
      if (bErr) throw bErr
      batchId = batch.id

      if (goodQty > 0) {
        const { error: mErr } = await supabase.from('movements').insert({
          movement_type: 'поставка',
          flower_id: flowerId,
          batch_id: batchId,
          quantity: goodQty,
        })
        if (mErr) throw mErr
      }

      const { error: uErr } = await supabase
        .from('delivery_items')
        .update({ batch_id: batchId })
        .eq('id', deliveryItem.id)
      if (uErr) throw uErr
    }

    const { data: defect, error: dErr } = await supabase
      .from('defects')
      .insert({
        batch_id: batchId,
        flower_id: flowerId,
        defect_type: 'брак',
        resolution: 'списание',
        quantity: defectQty,
      })
      .select('id')
      .single()
    if (dErr) throw dErr

    const { error: sErr } = await supabase.from('movements').insert({
      movement_type: 'списание',
      flower_id: flowerId,
      defect_id: defect.id,
      quantity: defectQty,
    })
    if (sErr) throw sErr

    const { error: upErr } = await supabase
      .from('delivery_items')
      .update({ defect_qty: defectQty, comment: comment || null })
      .eq('id', deliveryItem.id)
    if (upErr) throw upErr
  }

  return { markDefect }
}
