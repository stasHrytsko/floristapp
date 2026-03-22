import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useClientOrders(clientName) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientName) return
    setLoading(true)
    supabase
      .from('orders')
      .select('id, ready_at, status, delivery_type, order_items(quantity, flowers(name))')
      .eq('client_name', clientName)
      .order('ready_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setOrders(data || [])
        setLoading(false)
      })
  }, [clientName])

  return { orders, loading }
}
