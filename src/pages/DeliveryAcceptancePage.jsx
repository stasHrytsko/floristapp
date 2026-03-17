import { useState } from 'react'
import { useDeliveryStatus } from '../hooks/useDeliveryStatus'

const MODES = [
  { value: 'ok', label: 'OK' },
  { value: 'брак', label: 'Брак' },
  { value: 'не_тот_заказ', label: 'Не тот заказ' },
]

export default function DeliveryAcceptancePage({ delivery, onDone }) {
  const { acceptDelivery } = useDeliveryStatus()

  const [items, setItems] = useState(
    (delivery.delivery_items || []).map((item) => ({
      delivery_item_id: item.id,
      flower_id: item.flowers?.id,
      quantity: item.quantity,
      mode: 'ok',
      defect_qty: '',
      comment: '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const acceptanceItems = items.map((item) => ({
        ...item,
        defect_qty: item.mode === 'брак' ? Number(item.defect_qty) || 0 : 0,
        comment: item.mode === 'не_тот_заказ' ? item.comment : null,
      }))
      await acceptDelivery(delivery, acceptanceItems)
      onDone()
    } catch (err) {
      setError(err.message || 'Ошибка приёмки')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Приёмка: {delivery.suppliers?.name}
      </p>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {items.map((item, idx) => {
        const delivItem = delivery.delivery_items[idx]
        return (
          <div key={item.delivery_item_id} className="bg-white rounded-xl p-4 shadow-sm space-y-2">
            <p className="font-medium text-sm">
              {delivItem.flowers?.name} × {item.quantity}
            </p>
            <div className="flex gap-2">
              {MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => updateItem(idx, { mode: mode.value, defect_qty: '', comment: '' })}
                  className={`flex-1 py-1.5 text-xs rounded-lg border ${
                    item.mode === mode.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {item.mode === 'брак' && (
              <input
                type="number"
                min="1"
                max={item.quantity}
                placeholder="Кол-во брака"
                value={item.defect_qty}
                onChange={(e) => updateItem(idx, { defect_qty: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            )}
            {item.mode === 'не_тот_заказ' && (
              <input
                type="text"
                placeholder="Комментарий (напр.: прислали красные вместо белых)"
                value={item.comment}
                onChange={(e) => updateItem(idx, { comment: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>
        )
      })}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-green-600 text-white text-sm py-3 rounded-xl disabled:opacity-50"
      >
        {saving ? 'Сохранение...' : 'Подтвердить приёмку'}
      </button>

      <button
        type="button"
        onClick={onDone}
        className="w-full text-sm text-gray-400 py-2"
      >
        Отмена
      </button>
    </form>
  )
}
