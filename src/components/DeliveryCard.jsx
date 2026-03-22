import { useState } from 'react'
import { useDeliveryStatus } from '../hooks/useDeliveryStatus'

const STATUS_STYLES = {
  'заказано': 'bg-blue-100 text-blue-700',
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
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <div className="flex items-start justify-between mb-1">
        <span className="text-[17px] font-semibold text-gray-900 leading-tight">
          {suppliers?.name}
          {has_issues && <span className="ml-1">⚠️</span>}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 whitespace-nowrap ${statusStyle}`}>
          {status}
        </span>
      </div>

      {delivered_at && (
        <p className="text-[13px] text-gray-400 mb-2">{formatDate(delivered_at)}</p>
      )}

      {delivery_items.length > 0 && (
        <p className="text-[14px] text-gray-500 mb-3">
          {delivery_items.map((i) => `${i.flowers?.name} × ${i.quantity}`).join(', ')}
        </p>
      )}

      {error && <p className="text-xs text-red-500 mb-1">{error}</p>}

      {next && (
        <button
          onClick={goingToWarehouse ? onAccept : handleAdvance}
          disabled={advancing}
          className="w-full bg-gray-100 text-gray-700 text-sm py-2.5 rounded-xl font-medium disabled:opacity-50"
        >
          {advancing ? '...' : `→ ${next}`}
        </button>
      )}
    </div>
  )
}
