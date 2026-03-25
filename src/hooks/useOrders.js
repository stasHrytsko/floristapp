import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          id,
          client_name,
          client_phone,
          delivery_type,
          delivery_address,
          status,
          ready_at,
          comment,
          order_items (
            id,
            quantity,
            flower_id,
            flowers ( name )
          )
        `)
        .in('status', ['резерв', 'продано'])
        .order('ready_at', { ascending: true })

      if (err) throw err
      setOrders(data || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function closeOrder(id) {
    const order = orders.find((o) => o.id === id)
    const { error: err } = await supabase
      .from('orders')
      .update({ status: 'продано' })
      .eq('id', id)
    if (err) throw new Error('Не удалось закрыть заказ')

    for (const item of order?.order_items || []) {
      const { error: movErr } = await supabase.from('movements').insert({
        movement_type: 'выдача',
        flower_id: item.flower_id,
        order_id: id,
        quantity: item.quantity,
      })
      if (movErr) throw movErr
    }

    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'продано' } : o)))
  }

  async function deleteOrder(id) {
    const { error: err } = await supabase.from('orders').delete().eq('id', id)
    if (err) throw new Error('Не удалось удалить заказ')
    setOrders((prev) => prev.filter((o) => o.id !== id))
  }

  return { orders, loading, error, refresh: fetchData, closeOrder, deleteOrder }
}
