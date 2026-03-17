import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useMovementHistory(flowerId = null, batchIds = null) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('movements')
        .select('*, flowers(name), orders(client_name, ready_at), defects(defect_type), batches(delivery_items(reception_status, comment))')
        .order('created_at', { ascending: false })
        .limit(100)

      if (flowerId) query = query.eq('flower_id', flowerId)
      if (batchIds && batchIds.length > 0) query = query.in('batch_id', batchIds)

      const { data, error: err } = await query
      if (err) throw err
      setMovements(data || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [flowerId, batchIds?.join(',')])

  return { movements, loading, error, refresh: fetchData }
}
