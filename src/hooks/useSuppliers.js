import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('suppliers')
        .select('id, name, phone')
        .order('created_at', { ascending: true })
      if (err) throw err
      setSuppliers(data || [])
    } catch (err) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  async function addSupplier(name, phone) {
    const { data, error: err } = await supabase
      .from('suppliers')
      .insert({ name, phone })
      .select('id, name, phone')
      .single()
    if (err) throw err
    setSuppliers((prev) => [...prev, data])
  }

  async function updateSupplier(id, name, phone) {
    const { data, error: err } = await supabase
      .from('suppliers')
      .update({ name, phone })
      .eq('id', id)
      .select('id, name, phone')
      .single()
    if (err) throw err
    setSuppliers((prev) => prev.map((s) => (s.id === id ? data : s)))
  }

  async function deleteSupplier(id) {
    const { error: err } = await supabase.from('suppliers').delete().eq('id', id)
    if (err) throw err
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { suppliers, loading, error, addSupplier, updateSupplier, deleteSupplier }
}
