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
        .from('clients')
        .select('id, name, phone')
        .order('name')
      if (err) throw err
      setClients(data || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  async function updateClient(id, newName, newPhone) {
    const trimmedName = newName.trim()
    const trimmedPhone = newPhone.trim() || null
    const { error: err } = await supabase
      .from('clients')
      .update({ name: trimmedName, phone: trimmedPhone })
      .eq('id', id)
    if (err) throw err
    await supabase
      .from('orders')
      .update({ client_name: trimmedName, client_phone: trimmedPhone })
      .eq('client_id', id)
    await fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { clients, loading, error, refresh: fetchData, updateClient }
}
