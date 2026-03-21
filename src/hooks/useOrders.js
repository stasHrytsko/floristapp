import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FINAL_STATUSES = ['выдан клиенту', 'доставлен клиенту']

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
          order_items (
            quantity,
            flowers ( name )
          )
        `)
        .not('status', 'in', `(${FINAL_STATUSES.map((s) => `"${s}"`).join(',')})`)
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

  async function deleteOrder(id) {
    const { error: err } = await supabase.from('orders').delete().eq('id', id)
    if (err) throw new Error('Не удалось удалить заказ')
    setOrders((prev) => prev.filter((o) => o.id !== id))
  }

  return { orders, loading, error, refresh: fetchData, deleteOrder }
}
