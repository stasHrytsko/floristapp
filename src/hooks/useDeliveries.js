import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('deliveries')
        .select(`
          id, delivered_at, supplier_id, created_at,
          suppliers ( name ),
          delivery_items (
            id, quantity, batch_id, defect_qty, comment,
            flowers ( id, name )
          )
        `)
        .order('delivered_at', { ascending: false })
      if (err) throw err
      setDeliveries(data || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  async function deleteDelivery(id) {
    const delivery = deliveries.find((d) => d.id === id)
    const batchIds = (delivery?.delivery_items || []).map((i) => i.batch_id).filter(Boolean)

    if (batchIds.length > 0) {
      const { data: movs, error: mErr } = await supabase
        .from('movements')
        .select('id')
        .in('batch_id', batchIds)
        .in('movement_type', ['резерв', 'списание', 'выдача'])
        .limit(1)
      if (mErr) throw mErr
      if (movs?.length > 0) throw new Error('Нельзя удалить: есть зависимые движения')
    }

    if (batchIds.length > 0) {
      const { error: delMovErr } = await supabase
        .from('movements')
        .delete()
        .in('batch_id', batchIds)
        .eq('movement_type', 'поставка')
      if (delMovErr) throw delMovErr
    }

    const { error: diErr } = await supabase.from('delivery_items').delete().eq('delivery_id', id)
    if (diErr) throw diErr

    if (batchIds.length > 0) {
      const { error: bErr } = await supabase.from('batches').delete().in('id', batchIds)
      if (bErr) throw bErr
    }

    const { error: dErr } = await supabase.from('deliveries').delete().eq('id', id)
    if (dErr) throw dErr
    setDeliveries((prev) => prev.filter((d) => d.id !== id))
  }

  async function updateDelivery(id, { supplierId, deliveredAt, items }) {
    const delivery = deliveries.find((d) => d.id === id)
    const oldBatchIds = (delivery?.delivery_items || []).map((i) => i.batch_id).filter(Boolean)

    if (oldBatchIds.length > 0) {
      const { data: movs, error: mErr } = await supabase
        .from('movements')
        .select('id')
        .in('batch_id', oldBatchIds)
        .in('movement_type', ['резерв', 'списание', 'выдача'])
        .limit(1)
      if (mErr) throw mErr
      if (movs?.length > 0) throw new Error('Нельзя изменить: есть зависимые движения')
    }

    const { error: updErr } = await supabase
      .from('deliveries')
      .update({ supplier_id: supplierId, delivered_at: deliveredAt })
      .eq('id', id)
    if (updErr) throw updErr

    if (oldBatchIds.length > 0) {
      const { error: oldMovErr } = await supabase
        .from('movements')
        .delete()
        .in('batch_id', oldBatchIds)
        .eq('movement_type', 'поставка')
      if (oldMovErr) throw oldMovErr
    }

    const { error: delErr } = await supabase.from('delivery_items').delete().eq('delivery_id', id)
    if (delErr) throw delErr

    if (oldBatchIds.length > 0) {
      const { error: delBatchErr } = await supabase.from('batches').delete().in('id', oldBatchIds)
      if (delBatchErr) throw delBatchErr
    }

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
          delivery_id: id,
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

    await fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { deliveries, loading, error, refresh: fetchData, deleteDelivery, updateDelivery }
}
