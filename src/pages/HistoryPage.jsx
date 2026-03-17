import { useState } from 'react'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useMovementHistory } from '../hooks/useMovementHistory'
import { useBatchDeliveries } from '../hooks/useBatchDeliveries'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function formatShortDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    .replace(/\.$/, '')
}

function posLabel(n) {
  if (n === 1) return '1 позиция'
  if (n >= 2 && n <= 4) return `${n} позиции`
  return `${n} позиций`
}

function getMovementDisplay(m) {
  const deliveryItem = m.batches?.delivery_items?.[0]
  const isWrongOrder =
    m.movement_type === 'поставка' && deliveryItem?.reception_status === 'не_тот_заказ'

  if (isWrongOrder) {
    return {
      label: 'на складе',
      tagClass: 'bg-yellow-100 text-yellow-700',
      sign: '+',
      extra: deliveryItem.comment ? `⚠️ ${deliveryItem.comment}` : '⚠️ другой цвет',
    }
  }

  switch (m.movement_type) {
    case 'поставка':
      return { label: 'поставка', tagClass: 'bg-green-100 text-green-700', sign: '+', extra: null }
    case 'резерв':
      return {
        label: 'резерв',
        tagClass: 'bg-blue-100 text-blue-700',
        sign: '-',
        extra: m.orders
          ? `${m.orders.client_name}, ${formatShortDate(m.orders.ready_at)}`
          : null,
      }
    case 'списание':
      return { label: 'списание', tagClass: 'bg-red-100 text-red-700', sign: '-', extra: '⚠️ брак' }
    case 'выдача':
      return { label: 'выдача', tagClass: 'bg-gray-100 text-gray-600', sign: '-', extra: null }
    default:
      return { label: m.movement_type, tagClass: 'bg-gray-100 text-gray-600', sign: '', extra: null }
  }
}

function BatchPopup({ delivery, onClose }) {
  const items = delivery.delivery_items || []
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-800">
            {formatDate(delivery.delivered_at)} · {delivery.suppliers?.name}
          </p>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm text-gray-700">
              <span>{item.flowers?.name}</span>
              <span className="font-medium">{item.quantity} шт</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [mode, setMode] = useState('flower')
  const [flowerId, setFlowerId] = useState('')
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  const { flowers } = useFlowerStock()
  const { deliveries } = useBatchDeliveries()

  const batchIds =
    selectedDelivery?.delivery_items
      ?.filter((di) => di.batch_id)
      .map((di) => di.batch_id) || null

  const { movements, loading, error, refresh } = useMovementHistory(
    mode === 'flower' ? flowerId || null : null,
    mode === 'batch' ? batchIds : null
  )

  function handleDeliverySelect(deliveryId) {
    const d = deliveries.find((d) => d.id === deliveryId)
    setSelectedDelivery(d || null)
    if (d) setShowPopup(true)
  }

  return (
    <div>
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-4">
        <button
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === 'flower' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
          }`}
          onClick={() => { setMode('flower'); setSelectedDelivery(null) }}
        >
          По цветку
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === 'batch' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
          }`}
          onClick={() => { setMode('batch'); setFlowerId('') }}
        >
          По партии
        </button>
      </div>

      {mode === 'flower' && (
        <select
          value={flowerId}
          onChange={(e) => setFlowerId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white mb-4"
        >
          <option value="">Все цветы</option>
          {flowers.map((f) => (
            <option key={f.flower_id} value={f.flower_id}>
              {f.name}
            </option>
          ))}
        </select>
      )}

      {mode === 'batch' && (
        <select
          value={selectedDelivery?.id || ''}
          onChange={(e) => handleDeliverySelect(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white mb-4"
        >
          <option value="">Выбрать партию</option>
          {deliveries.map((d) => (
            <option key={d.id} value={d.id}>
              {formatDate(d.delivered_at)} · {d.suppliers?.name} · {posLabel(d.delivery_items?.length || 0)}
            </option>
          ))}
        </select>
      )}

      {showPopup && selectedDelivery && (
        <BatchPopup delivery={selectedDelivery} onClose={() => setShowPopup(false)} />
      )}

      {loading && (
        <p className="text-center text-gray-400 text-sm mt-6">Загрузка...</p>
      )}

      {error && (
        <div className="text-center mt-6">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button onClick={refresh} className="text-sm text-green-600 underline">
            Повторить
          </button>
        </div>
      )}

      {!loading && !error && movements.length > 0 && (
        <ul className="space-y-2">
          {movements.map((m) => {
            const { label, tagClass, sign, extra } = getMovementDisplay(m)
            return (
              <li
                key={m.id}
                className="bg-white rounded-lg px-4 py-3 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.flowers?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(m.created_at)}</p>
                  {extra && <p className="text-xs text-gray-500 mt-0.5">{extra}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagClass}`}>
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {sign}{Math.abs(m.quantity)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
