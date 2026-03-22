import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSupplierDeliveries(supplierId) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supplierId) return
    setLoading(true)
    supabase
      .from('deliveries')
      .select('id, delivered_at, status, delivery_items(quantity, flowers(name))')
      .eq('supplier_id', supplierId)
      .order('delivered_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setDeliveries(data || [])
        setLoading(false)
      })
  }, [supplierId])

  return { deliveries, loading }
}
