import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useDeliveries(filter = 'active') {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('deliveries')
        .select(`
          id, delivered_at, status, has_issues, supplier_id, created_at,
          suppliers ( name ),
          delivery_items (
            id, quantity, reception_status, defect_qty, comment,
            flowers ( id, name )
          )
        `)
        .order('created_at', { ascending: false })

      if (filter === 'active') {
        query = query.neq('status', 'на складе')
      }

      const { data, error: err } = await query
      if (err) throw err
      setDeliveries(data || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filter])

  return { deliveries, loading, error, refresh: fetchData }
}
