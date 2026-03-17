import { useState } from 'react'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useNewOrder } from '../hooks/useNewOrder'

function newItem() {
  return { id: Date.now() + Math.random(), flowerId: '', quantity: '' }
}

export default function NewOrderPage() {
  const { flowers, loading } = useFlowerStock()
  const { saveOrder } = useNewOrder()

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [readyAt, setReadyAt] = useState('')
  const [deliveryType, setDeliveryType] = useState('самовывоз')
  const [address, setAddress] = useState('')
  const [items, setItems] = useState([newItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const availableFlowers = (flowers || []).filter((f) => f.available > 0)

  function updateItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()])
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function maxQty(flowerId) {
    const f = availableFlowers.find((f) => f.flower_id === flowerId)
    return f ? f.available : 0
  }

  const isValid =
    clientName.trim() &&
    readyAt &&
    items.length > 0 &&
    items.every(
      (it) =>
        it.flowerId &&
        Number(it.quantity) > 0 &&
        Number(it.quantity) <= maxQty(it.flowerId)
    ) &&
    (deliveryType === 'самовывоз' || address.trim())

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      await saveOrder({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || null,
        readyAt,
        deliveryType,
        address: address.trim(),
        items: items.map((it) => ({ flowerId: it.flowerId, quantity: Number(it.quantity) })),
      })
      setSuccess(true)
      setClientName('')
      setClientPhone('')
      setReadyAt('')
      setDeliveryType('самовывоз')
      setAddress('')
      setItems([newItem()])
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <p className="text-green-600 text-sm text-center bg-green-50 rounded-xl py-2">
          Заказ сохранён
        </p>
      )}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Имя клиента</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Введите имя"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Телефон</label>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="+7 999 000 00 00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Дата готовности</label>
          <input
            type="date"
            value={readyAt}
            onChange={(e) => setReadyAt(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Тип получения</label>
          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="самовывоз">Самовывоз</option>
            <option value="доставка">Доставка</option>
          </select>
        </div>
        {deliveryType === 'доставка' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Адрес доставки</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Введите адрес"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {items.map((item, idx) => {
        const max = maxQty(item.flowerId)
        return (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Позиция {idx + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-xs text-red-400"
                >
                  Удалить
                </button>
              )}
            </div>
            <select
              value={item.flowerId}
              onChange={(e) => updateItem(item.id, { flowerId: e.target.value, quantity: '' })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Выберите цветок</option>
              {availableFlowers.map((f) => (
                <option key={f.flower_id} value={f.flower_id}>
                  {f.name} (свободно: {f.available})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max={item.flowerId ? max : undefined}
              placeholder="Количество (шт)"
              value={item.quantity}
              onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )
      })}

      <button
        type="button"
        onClick={addItem}
        className="w-full border border-green-600 text-green-600 text-sm py-2 rounded-xl"
      >
        + Добавить цветок
      </button>

      <button
        type="submit"
        disabled={saving || !isValid}
        className="w-full bg-green-600 text-white text-sm py-3 rounded-xl disabled:opacity-50"
      >
        {saving ? 'Сохранение...' : 'Сохранить заказ'}
      </button>
    </form>
  )
}
