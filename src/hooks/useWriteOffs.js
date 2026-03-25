import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useWriteOffs() {
  const [writeOffs, setWriteOffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('defects')
        .select('id, quantity, created_at, flowers ( id, name )')
        .eq('resolution', 'списание')
        .is('batch_id', null)
        .order('created_at', { ascending: false })
      if (err) throw err
      setWriteOffs(data || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { writeOffs, loading, error, refresh: fetchData }
}
