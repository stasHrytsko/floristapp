import { supabase } from '../lib/supabase'

const DEFECT_RESOLUTION = {
  'гнилой': 'возврат',
  'не_тот_цвет': 'скидка',
}

export function useDelivery() {
  async function saveDelivery({ supplierId, deliveredAt, items }) {
    for (const item of items) {
      const { flowerId, quantity, defectType, defectQty } = item

      // Гнилой = списание (не попадает в остаток)
      const goodQty = defectType === 'гнилой' ? quantity - defectQty : quantity

      const { data: batch, error: batchErr } = await supabase
        .from('batches')
        .insert({ supplier_id: supplierId, flower_id: flowerId, delivered_at: deliveredAt, quantity })
        .select('id')
        .single()
      if (batchErr) throw batchErr

      const { error: movErr } = await supabase
        .from('movements')
        .insert({ movement_type: 'поставка', flower_id: flowerId, batch_id: batch.id, quantity: goodQty })
      if (movErr) throw movErr

      if (defectType && defectQty > 0) {
        const { error: defErr } = await supabase
          .from('defects')
          .insert({
            batch_id: batch.id,
            flower_id: flowerId,
            defect_type: defectType,
            resolution: DEFECT_RESOLUTION[defectType] || 'возврат',
            quantity: defectQty,
          })
        if (defErr) throw defErr
      }
    }
  }

  return { saveDelivery }
}
