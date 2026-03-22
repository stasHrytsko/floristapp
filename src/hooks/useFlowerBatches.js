import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useFlowerBatches(flowerId) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!flowerId) return
    setLoading(true)
    supabase
      .from('batches')
      .select('id, quantity, delivered_at, suppliers(name)')
      .eq('flower_id', flowerId)
      .order('delivered_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setBatches(data || [])
        setLoading(false)
      })
  }, [flowerId])

  return { batches, loading }
}
