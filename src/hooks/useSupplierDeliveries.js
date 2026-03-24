import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${m}-${d}-${y}`
}

export function useSupplierDeliveries(supplierId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supplierId) return
    let mounted = true
    setLoading(true)
    setError(null)
    supabase
      .from('deliveries')
      .select('delivered_at, delivery_items(quantity, flowers(name))')
      .eq('supplier_id', supplierId)
      .order('delivered_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (!mounted) return
        if (err) {
          setError(err.message || 'Ошибка загрузки')
        } else {
          setRows(
            (data || []).flatMap((d) =>
              (d.delivery_items || []).map((item) => ({
                date: formatDate(d.delivered_at),
                name: item.flowers?.name || '—',
                quantity: item.quantity,
                defects: 0,
              }))
            )
          )
        }
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [supplierId])

  return { rows, loading, error }
}
