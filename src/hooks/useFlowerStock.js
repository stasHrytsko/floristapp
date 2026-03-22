import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useFlowerStock() {
  const [flowers, setFlowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('flower_stock').select('*')
      if (error) throw error
      setFlowers(data || [])
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
