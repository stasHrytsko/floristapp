import { supabase } from '../lib/supabase'

export const DELIVERY_STATUSES = ['оформлено', 'оплачено', 'доставка', 'на складе']

export function useDeliveryStatus() {
  function nextStatus(current) {
    const idx = DELIVERY_STATUSES.indexOf(current)
    return idx >= 0 && idx < DELIVERY_STATUSES.length - 1 ? DELIVERY_STATUSES[idx + 1] : null
  }

  async function advanceStatus(deliveryId, currentStatus) {
    const next = nextStatus(currentStatus)
    if (!next || next === 'на складе') return
    const { error } = await supabase
      .from('deliveries')
      .update({ status: next })
      .eq('id', deliveryId)
    if (error) throw error
  }

  async function acceptDelivery(delivery, acceptanceItems) {
    for (const item of acceptanceItems) {
      const goodQty =
        item.mode === 'брак' ? item.quantity - (item.defect_qty || 0) : item.quantity

      const { data: batch, error: batchErr } = await supabase
        .from('batches')
        .insert({
          supplier_id: delivery.supplier_id,
          flower_id: item.flower_id,
          quantity: item.quantity,
          delivered_at: delivery.delivered_at,
        })
        .select('id')
        .single()
      if (batchErr) throw batchErr

      const { error: movErr } = await supabase.from('movements').insert({
        movement_type: 'поставка',
        flower_id: item.flower_id,
        batch_id: batch.id,
        quantity: goodQty,
      })
      if (movErr) throw movErr

      if (item.mode === 'брак' && item.defect_qty > 0) {
        const { data: defect, error: defErr } = await supabase
          .from('defects')
          .insert({
            batch_id: batch.id,
            flower_id: item.flower_id,
            defect_type: 'гнилой',
            resolution: 'возврат',
            quantity: item.defect_qty,
          })
          .select('id')
          .single()
        if (defErr) throw defErr

        const { error: sErr } = await supabase.from('movements').insert({
          movement_type: 'списание',
          flower_id: item.flower_id,
          defect_id: defect.id,
          quantity: item.defect_qty,
        })
        if (sErr) throw sErr
      }

      const { error: itemErr } = await supabase
        .from('delivery_items')
        .update({
          batch_id: batch.id,
          reception_status: item.mode,
          defect_qty: item.mode === 'брак' ? item.defect_qty : null,
          comment: item.mode === 'не_тот_заказ' ? item.comment : null,
        })
        .eq('id', item.delivery_item_id)
      if (itemErr) throw itemErr
    }

    const hasIssues = acceptanceItems.some((i) => i.mode !== 'ok')
    const { error: deliveryErr } = await supabase
      .from('deliveries')
      .update({ status: 'на складе', has_issues: hasIssues })
      .eq('id', delivery.id)
    if (deliveryErr) throw deliveryErr
  }

  return { nextStatus, advanceStatus, acceptDelivery }
}
