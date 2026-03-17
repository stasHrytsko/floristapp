import { useState } from 'react'
import { useDeliveryStatus, DELIVERY_STATUSES } from '../hooks/useDeliveryStatus'

const STATUS_STYLES = {
  'оформлено': 'bg-blue-100 text-blue-700',
  'оплачено': 'bg-yellow-100 text-yellow-700',
  'доставка': 'bg-orange-100 text-orange-700',
  'на складе': 'bg-green-100 text-green-700',
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function DeliveryCard({ delivery, onAccept, onRefresh }) {
  const { advanceStatus, nextStatus } = useDeliveryStatus()
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState(null)

  const { suppliers, delivered_at, status, has_issues, delivery_items = [] } = delivery
  const statusStyle = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
  const next = nextStatus(status)
  const goingToWarehouse = next === 'на складе'

  async function handleAdvance() {
    setAdvancing(true)
    setError(null)
    try {
      await advanceStatus(delivery.id, status)
      onRefresh()
    } catch (err) {
      setError(err.message || 'Ошибка')
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-medium text-gray-900">
            {suppliers?.name}
            {has_issues && <span className="ml-1">⚠️</span>}
          </span>
          {delivered_at && (
            <span className="block text-xs text-gray-400">{formatDate(delivered_at)}</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
          {status}
        </span>
      </div>

      {delivery_items.length > 0 && (
        <p className="text-sm text-gray-600 mb-2">
          {delivery_items.map((i) => `${i.flowers?.name} × ${i.quantity}`).join(', ')}
        </p>
      )}

      {error && <p className="text-xs text-red-500 mb-1">{error}</p>}

      {next && (
        <button
          onClick={goingToWarehouse ? onAccept : handleAdvance}
          disabled={advancing}
          className="w-full border border-green-600 text-green-600 text-xs py-1.5 rounded-lg disabled:opacity-50"
        >
          {advancing ? '...' : `→ ${next}`}
        </button>
      )}
    </div>
  )
}
