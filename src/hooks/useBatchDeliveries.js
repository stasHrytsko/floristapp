import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useBatchDeliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('deliveries')
        .select('id, delivered_at, suppliers(name), delivery_items(id, flower_id, quantity, batch_id, flowers(name))')
        .eq('status', 'на складе')
        .order('delivered_at', { ascending: false })
      if (err) throw err
      setDeliveries(data || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { deliveries, loading, error }
}
