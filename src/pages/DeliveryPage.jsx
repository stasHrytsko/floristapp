import { useState } from 'react'
import { useSuppliers } from '../hooks/useSuppliers'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useDelivery } from '../hooks/useDelivery'

const DEFECT_OPTIONS = [
  { value: '', label: 'Без брака' },
  { value: 'гнилой', label: 'Гнилой — списание' },
  { value: 'не_тот_цвет', label: 'Не тот цвет — скидка' },
]

function newRow() {
  return { id: Date.now() + Math.random(), flowerId: '', quantity: '', defectType: '', defectQty: '' }
}

export default function DeliveryPage() {
  const { suppliers, loading: suppLoading } = useSuppliers()
  const { flowers, loading: flowLoading } = useFlowerStock()
  const { saveDelivery } = useDelivery()

  const [supplierId, setSupplierId] = useState('')
  const [deliveredAt, setDeliveredAt] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState([newRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()])
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const isValid =
    supplierId &&
    deliveredAt &&
    rows.length > 0 &&
    rows.every(
      (r) =>
        r.flowerId &&
        Number(r.quantity) > 0 &&
        (!r.defectType || Number(r.defectQty) > 0)
    )

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const items = rows.map((r) => ({
        flowerId: r.flowerId,
        quantity: Number(r.quantity),
        defectType: r.defectType || null,
        defectQty: r.defectType ? Number(r.defectQty) || 0 : 0,
      }))
      await saveDelivery({ supplierId, deliveredAt, items })
      setSuccess(true)
      setRows([newRow()])
      setSupplierId('')
      setDeliveredAt(new Date().toISOString().split('T')[0])
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (suppLoading || flowLoading) {
    return <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <p className="text-green-600 text-sm text-center bg-green-50 rounded-xl py-2">
          Поставка сохранена
        </p>
      )}
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
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
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
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-xs text-red-400"
              >
                Удалить
              </button>
            )}
          </div>

          <select
            value={row.flowerId}
            onChange={(e) => updateRow(row.id, { flowerId: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Выберите цветок</option>
            {flowers.map((f) => (
              <option key={f.flower_id} value={f.flower_id}>
                {f.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            placeholder="Количество (шт)"
            value={row.quantity}
            onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

          <select
            value={row.defectType}
            onChange={(e) =>
              updateRow(row.id, { defectType: e.target.value, defectQty: '' })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {DEFECT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {row.defectType && (
            <input
              type="number"
              min="1"
              max={row.quantity || undefined}
              placeholder="Кол-во брака"
              value={row.defectQty}
              onChange={(e) => updateRow(row.id, { defectQty: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          )}
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
  )
}
