import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}-${m}-${y}`
}

export function useSupplierDeliveries(supplierId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supplierId) return
    setLoading(true)
    supabase
      .from('deliveries')
      .select('delivered_at, delivery_items(id, quantity, flowers(name), defects(quantity))')
      .eq('supplier_id', supplierId)
      .order('delivered_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const flat = data.flatMap((d) =>
            (d.delivery_items || []).map((item) => ({
              date: formatDate(d.delivered_at),
              name: item.flowers?.name || '—',
              quantity: item.quantity,
              defects: (item.defects || []).reduce((sum, def) => sum + (def.quantity || 0), 0),
            }))
          )
          setRows(flat)
        }
        setLoading(false)
      })
  }, [supplierId])

  return { rows, loading }
}
