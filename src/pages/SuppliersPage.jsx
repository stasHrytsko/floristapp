import { useState } from 'react'
import { useSuppliers } from '../hooks/useSuppliers'

const MAX_SUPPLIERS = 5

function SupplierForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim(), phone.trim())
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
      <input
        type="text"
        placeholder="Имя поставщика"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        required
      />
      <input
        type="tel"
        placeholder="Телефон"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-600 text-sm py-2 rounded-lg"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}

export default function SuppliersPage() {
  const { suppliers, loading, error, addSupplier, updateSupplier, deleteSupplier } = useSuppliers()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const atLimit = suppliers.length >= MAX_SUPPLIERS

  async function handleAdd(name, phone) {
    await addSupplier(name, phone)
    setShowAddForm(false)
  }

  async function handleUpdate(name, phone) {
    await updateSupplier(editingId, name, phone)
    setEditingId(null)
  }

  async function handleDelete(id) {
    setDeleteError(null)
    try {
      await deleteSupplier(id)
    } catch (err) {
      setDeleteError(err.message || 'Ошибка удаления')
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
  }

  if (error) {
    return <p className="text-center text-red-500 mt-10 text-sm">{error}</p>
  }

  return (
    <div>
      {showAddForm && (
        <SupplierForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
      )}

      {deleteError && (
        <p className="text-red-500 text-xs text-center mb-3">{deleteError}</p>
      )}

      {suppliers.length === 0 && !showAddForm && (
        <p className="text-center text-gray-400 text-sm mt-6 mb-4">Поставщики не добавлены</p>
      )}

      <ul className="space-y-2 mb-4">
        {suppliers.map((s) =>
          editingId === s.id ? (
            <li key={s.id}>
              <SupplierForm
                initial={s}
                onSave={handleUpdate}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={s.id}
              className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingId(s.id)}
                  className="text-xs text-blue-500"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-xs text-red-400"
                >
                  Удалить
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          disabled={atLimit}
          className="w-full bg-green-600 text-white text-sm py-3 rounded-xl disabled:opacity-40"
        >
          {atLimit ? `Максимум ${MAX_SUPPLIERS} поставщиков` : '+ Добавить поставщика'}
        </button>
      )}
    </div>
  )
}
