import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('client_name, client_phone')
        .order('client_name')
      if (err) throw err

      const map = {}
      ;(data || []).forEach((o) => {
        if (!map[o.client_name]) {
          map[o.client_name] = { name: o.client_name, phone: o.client_phone || '' }
        }
      })
      setClients(Object.values(map))
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  async function updateClient(oldName, newName, newPhone) {
    const { error: err } = await supabase
      .from('orders')
      .update({ client_name: newName.trim(), client_phone: newPhone.trim() || null })
      .eq('client_name', oldName)
    if (err) throw err
    await fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { clients, loading, error, refresh: fetchData, updateClient }
}
