import { supabase } from '../lib/supabase'

export function useNewOrder() {
  async function saveOrder({ clientName, clientPhone, readyAt, deliveryType, address, items }) {
    // Повторная проверка остатков перед записью
    const flowerIds = items.map((i) => i.flowerId)
    const { data: stock, error: stockErr } = await supabase
      .from('flower_stock')
      .select('flower_id, name, available')
      .in('flower_id', flowerIds)
    if (stockErr) throw stockErr
    for (const item of items) {
      const s = stock?.find((s) => s.flower_id === item.flowerId)
      if (!s || item.quantity > s.available) {
        const name = s?.name ?? 'цветка'
        const avail = s?.available ?? 0
        throw new Error(`На складе только ${avail} ${name.toLowerCase()}`)
      }
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        client_name: clientName,
        client_phone: clientPhone || null,
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'доставка' ? address : null,
        ready_at: readyAt,
        status: 'новый',
      })
      .select('id')
      .single()
    if (orderErr) throw orderErr

    for (const item of items) {
      const { error: itemErr } = await supabase
        .from('order_items')
        .insert({ order_id: order.id, flower_id: item.flowerId, quantity: item.quantity })
      if (itemErr) throw itemErr

      const { error: movErr } = await supabase
        .from('movements')
        .insert({
          flower_id: item.flowerId,
          order_id: order.id,
          movement_type: 'резерв',
          quantity: item.quantity,
        })
      if (movErr) throw movErr
    }
  }

  return { saveOrder }
}
