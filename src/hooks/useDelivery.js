import { supabase } from '../lib/supabase'

export function useDelivery() {
  async function saveDelivery({ supplierId, deliveredAt, items }) {
    const { data: delivery, error: delErr } = await supabase
      .from('deliveries')
      .insert({ supplier_id: supplierId, delivered_at: deliveredAt, status: 'заказано' })
      .select('id')
      .single()
    if (delErr) throw delErr

    const itemRows = items.map((item) => ({
      delivery_id: delivery.id,
      flower_id: item.flowerId,
      quantity: item.quantity,
    }))
    const { error: itemsErr } = await supabase.from('delivery_items').insert(itemRows)
    if (itemsErr) throw itemsErr
  }

  return { saveDelivery }
}
