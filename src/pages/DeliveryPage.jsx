import { useState } from 'react'
import { useSuppliers } from '../hooks/useSuppliers'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useDelivery } from '../hooks/useDelivery'
import { useAddFlower } from '../hooks/useAddFlower'
import { useDeliveries } from '../hooks/useDeliveries'
import DeliveryCard from '../components/DeliveryCard'
import DeliveryAcceptancePage from './DeliveryAcceptancePage'

function newRow() {
  return { id: Date.now() + Math.random(), flowerId: '', quantity: '' }
}

export default function DeliveryPage() {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('active')
  const [acceptingDelivery, setAcceptingDelivery] = useState(null)

  const { suppliers, loading: suppLoading } = useSuppliers()
  const { flowers, loading: flowLoading, refresh: refreshFlowers } = useFlowerStock()
  const { saveDelivery } = useDelivery()
  const { addFlower } = useAddFlower()
  const { deliveries, loading: delivLoading, error: delivError, refresh } = useDeliveries(filter)

  const [supplierId, setSupplierId] = useState('')
  const [deliveredAt, setDeliveredAt] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState([newRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [newFlowerRowId, setNewFlowerRowId] = useState(null)
  const [newFlowerName, setNewFlowerName] = useState('')
  const [addingFlower, setAddingFlower] = useState(false)

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()])
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleAddFlower(rowId) {
    setAddingFlower(true)
    try {
      const flower = await addFlower(newFlowerName)
      await refreshFlowers()
      updateRow(rowId, { flowerId: flower.id })
      setNewFlowerRowId(null)
      setNewFlowerName('')
    } catch (err) {
      setError(err.message || 'Ошибка добавления цветка')
    } finally {
      setAddingFlower(false)
    }
  }

  const isValid =
    supplierId &&
    deliveredAt &&
    rows.length > 0 &&
    rows.every((r) => r.flowerId && Number(r.quantity) > 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const items = rows.map((r) => ({ flowerId: r.flowerId, quantity: Number(r.quantity) }))
      await saveDelivery({ supplierId, deliveredAt, items })
      setSuccess(true)
      setRows([newRow()])
      setSupplierId('')
      setDeliveredAt(new Date().toISOString().split('T')[0])
      setShowForm(false)
      refresh()
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (acceptingDelivery) {
    return (
      <DeliveryAcceptancePage
        delivery={acceptingDelivery}
        onDone={() => { setAcceptingDelivery(null); refresh() }}
      />
    )
  }

  if (suppLoading || flowLoading) {
    return <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
  }

  return (
    <div className="space-y-4">
      {success && (
        <p className="text-green-600 text-sm text-center bg-green-50 rounded-xl py-2">
          Поставка оформлена
        </p>
      )}

      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full bg-green-600 text-white text-sm py-3 rounded-xl"
      >
        {showForm ? 'Скрыть форму' : '+ Новая поставка'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Поставщик</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Выберите поставщика</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Дата поставки</label>
              <input
                type="date"
                value={deliveredAt}
                onChange={(e) => setDeliveredAt(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {rows.map((row, idx) => (
            <div key={row.id} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Позиция {idx + 1}</span>
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(row.id)} className="text-xs text-red-400">
                    Удалить
                  </button>
                )}
              </div>

              {newFlowerRowId === row.id ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Название цветка"
                    value={newFlowerName}
                    onChange={(e) => setNewFlowerName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={addingFlower || !newFlowerName.trim()}
                    onClick={() => handleAddFlower(row.id)}
                    className="text-sm text-white bg-green-600 px-3 rounded-lg disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewFlowerRowId(null); setNewFlowerName('') }}
                    className="text-sm text-gray-400"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={row.flowerId}
                    onChange={(e) => updateRow(row.id, { flowerId: e.target.value })}
                    required
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Выберите цветок</option>
                    {flowers.map((f) => (
                      <option key={f.flower_id} value={f.flower_id}>{f.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setNewFlowerRowId(row.id)}
                    className="text-sm text-green-600 border border-green-600 px-3 rounded-lg whitespace-nowrap"
                  >
                    + Новый
                  </button>
                </div>
              )}

              <input
                type="number"
                min="1"
                placeholder="Количество (шт)"
                value={row.quantity}
                onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="w-full border border-green-600 text-green-600 text-sm py-2 rounded-xl"
          >
            + Добавить позицию
          </button>

          <button
            type="submit"
            disabled={saving || !isValid}
            className="w-full bg-green-600 text-white text-sm py-3 rounded-xl disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить поставку'}
          </button>
        </form>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('active')}
          className={`flex-1 py-2 text-sm rounded-xl border ${
            filter === 'active' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'
          }`}
        >
          Активные
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 text-sm rounded-xl border ${
            filter === 'all' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'
          }`}
        >
          Все
        </button>
      </div>

      {delivLoading && <p className="text-center text-gray-400 text-sm">Загрузка...</p>}
      {delivError && <p className="text-center text-red-500 text-sm">{delivError}</p>}

      {!delivLoading && !delivError && deliveries.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-4">Поставок нет</p>
      )}

      {deliveries.map((d) => (
        <DeliveryCard
          key={d.id}
          delivery={d}
          onAccept={() => setAcceptingDelivery(d)}
          onRefresh={refresh}
        />
      ))}
    </div>
  )
}
