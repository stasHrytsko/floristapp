import { useState, useEffect } from 'react'
import { useSuppliers } from '../hooks/useSuppliers'
import { useSupplierDeliveries } from '../hooks/useSupplierDeliveries'
import ConfirmDialog from '../components/ConfirmDialog'

function SupplierForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [nameTouched, setNameTouched] = useState(false)

  const nameError = nameTouched && !name.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    setNameTouched(true)
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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3 space-y-3">
      <div>
        <input
          type="text"
          placeholder="Имя поставщика"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          className={`w-full border rounded-lg px-3 py-2 text-sm ${nameError ? 'border-red-400' : 'border-gray-300'}`}
          required
        />
        {nameError && <p className="text-red-500 text-xs mt-1">Обязательное поле</p>}
      </div>
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
          disabled={saving}
          className="flex-1 bg-green-600 text-white text-sm py-2.5 rounded-xl disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 text-sm py-2.5 rounded-xl"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}

function SupplierDeliveriesSheet({ supplier, onClose }) {
  const { rows, loading } = useSupplierDeliveries(supplier.id)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-800">Поставки: {supplier.name}</p>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 text-center">Загрузка...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">Поставок нет</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, i) => (
              <li key={i} className="text-sm text-gray-700 py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 mr-1">{row.date}</span>
                {' — '}
                <span className="font-medium">{row.name}</span>
                {' — '}
                <span>{row.quantity} шт</span>
                {' — '}
                <span className={row.defects > 0 ? 'text-red-500' : 'text-gray-400'}>
                  брак: {row.defects}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function SuppliersPage({ addFormOpen, onAddFormClose }) {
  const { suppliers, loading, error, addSupplier, updateSupplier, deleteSupplier } = useSuppliers()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [detailsSupplier, setDetailsSupplier] = useState(null)

  useEffect(() => {
    if (addFormOpen) setShowAddForm(true)
  }, [addFormOpen])

  function handleFormClose() {
    setShowAddForm(false)
    onAddFormClose?.()
  }

  async function handleAdd(name, phone) {
    await addSupplier(name, phone)
    setShowAddForm(false)
    onAddFormClose?.()
  }

  async function handleUpdate(name, phone) {
    await updateSupplier(editingId, name, phone)
    setEditingId(null)
  }

  async function handleDelete(id) {
    setDeleteError(null)
    setConfirmDelete(null)
    try {
      await deleteSupplier(id)
    } catch (err) {
      setDeleteError('Не удалось удалить поставщика')
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
  }

  if (error) {
    return <p className="text-center text-red-500 mt-10 text-sm">Не удалось загрузить поставщиков</p>
  }

  return (
    <div>
      {showAddForm && (
        <SupplierForm onSave={handleAdd} onCancel={handleFormClose} />
      )}

      {deleteError && (
        <p className="text-red-500 text-xs text-center mb-3">{deleteError}</p>
      )}

      {suppliers.length === 0 && !showAddForm && (
        <p className="text-center text-gray-400 text-sm mt-6 mb-4">Поставщики не добавлены</p>
      )}

      <ul className="space-y-3 mb-4">
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
            <li key={s.id} className="bg-white rounded-2xl px-4 py-3 border border-gray-100">
              <p className="text-[16px] font-bold text-gray-900 mb-0.5">{s.name}</p>
              {s.phone && <p className="text-[13px] text-gray-400 mb-3">{s.phone}</p>}
              {!s.phone && <div className="mb-3" />}
              <div className="flex gap-2">
                <button
                  onClick={() => setDetailsSupplier(s)}
                  className="flex-1 bg-gray-100 text-gray-700 text-sm py-2.5 rounded-xl font-medium"
                >
                  Детали
                </button>
                <button
                  onClick={() => setEditingId(s.id)}
                  className="flex-1 bg-gray-100 text-gray-700 text-sm py-2.5 rounded-xl font-medium"
                >
                  Изменить
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
                  className="flex-1 bg-gray-100 text-red-500 text-sm py-2.5 rounded-xl font-medium"
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
          className="w-full bg-green-600 text-white text-[15px] font-medium py-4 rounded-xl"
        >
          Добавить
        </button>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Удалить поставщика «${confirmDelete.name}»?`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {detailsSupplier && (
        <SupplierDeliveriesSheet
          supplier={detailsSupplier}
          onClose={() => setDetailsSupplier(null)}
        />
      )}
    </div>
  )
}
