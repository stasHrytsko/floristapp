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

    const { error: diErr } = await supabase.from('delivery_items').delete().eq('delivery_id', id)
    if (diErr) throw diErr
    const { error: dErr } = await supabase.from('deliveries').delete().eq('id', id)
    if (dErr) throw dErr
    setDeliveries((prev) => prev.filter((d) => d.id !== id))
  }

  async function updateDelivery(id, { supplierId, deliveredAt, items }) {
    const { error: updErr } = await supabase
      .from('deliveries')
      .update({ supplier_id: supplierId, delivered_at: deliveredAt })
      .eq('id', id)
    if (updErr) throw updErr

    const { error: delErr } = await supabase.from('delivery_items').delete().eq('delivery_id', id)
    if (delErr) throw delErr

    const { error: insErr } = await supabase.from('delivery_items').insert(
      items.map((i) => ({ delivery_id: id, flower_id: i.flowerId, quantity: i.quantity }))
    )
    if (insErr) throw insErr

    await fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { deliveries, loading, error, refresh: fetchData, deleteDelivery, updateDelivery }
}
