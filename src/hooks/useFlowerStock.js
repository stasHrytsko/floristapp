import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STALE_DAYS = 5

export function useFlowerStock() {
  const [flowers, setFlowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const staleDate = new Date()
      staleDate.setDate(staleDate.getDate() - STALE_DAYS)
      const staleDateStr = staleDate.toISOString().split('T')[0]

      const [stockRes, batchRes] = await Promise.all([
        supabase.from('flower_stock').select('*'),
        supabase.from('batches').select('flower_id').lt('delivered_at', staleDateStr),
      ])

      if (stockRes.error) throw stockRes.error
      if (batchRes.error) throw batchRes.error

      const staleFlowerIds = new Set((batchRes.data || []).map((b) => b.flower_id))

      setFlowers(
        (stockRes.data || []).map((f) => ({
          ...f,
          stale: staleFlowerIds.has(f.flower_id),
        }))
      )
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { flowers, loading, error, refresh: fetchData }
}
