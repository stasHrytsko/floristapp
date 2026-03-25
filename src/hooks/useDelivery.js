import { supabase } from '../lib/supabase'

export function useDelivery() {
  async function saveDelivery({ supplierId, deliveredAt, items }) {
    const { data: delivery, error: delErr } = await supabase
      .from('deliveries')
      .insert({ supplier_id: supplierId, delivered_at: deliveredAt })
      .select('id')
      .single()
    if (delErr) throw delErr

    for (const item of items) {
      const { data: batch, error: batchErr } = await supabase
        .from('batches')
        .insert({
          supplier_id: supplierId,
          flower_id: item.flowerId,
          quantity: item.quantity,
          delivered_at: deliveredAt,
        })
        .select('id')
        .single()
      if (batchErr) throw batchErr

      const { error: itemErr } = await supabase
        .from('delivery_items')
        .insert({
          delivery_id: delivery.id,
          flower_id: item.flowerId,
          quantity: item.quantity,
          batch_id: batch.id,
          reception_status: 'ok',
        })
      if (itemErr) throw itemErr

      const { error: movErr } = await supabase
        .from('movements')
        .insert({
          flower_id: item.flowerId,
          batch_id: batch.id,
          movement_type: 'поставка',
          quantity: item.quantity,
        })
      if (movErr) throw movErr
    }
  }

  return { saveDelivery }
}
