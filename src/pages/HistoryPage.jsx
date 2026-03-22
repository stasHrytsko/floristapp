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

function groupByDate(deliveries) {
  const map = {}
  deliveries.forEach((d) => {
    const date = d.delivered_at
    if (!map[date]) map[date] = []
    ;(d.delivery_items || []).forEach((item) => {
      map[date].push({
        flower: item.flowers?.name || '—',
        supplier: d.suppliers?.name || '—',
        quantity: item.quantity,
      })
    })
  })
  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, items: map[date] }))
}

export default function HistoryPage() {
  const [mode, setMode] = useState('flower')
  const [flowerId, setFlowerId] = useState('')

  const { flowers } = useFlowerStock()
  const { deliveries } = useBatchDeliveries()
  const { movements, loading, error, refresh } = useMovementHistory(
    mode === 'flower' ? flowerId || null : null,
    null
  )

  const dateGroups = mode === 'date' ? groupByDate(deliveries) : []

  return (
    <div>
      <div className="flex bg-gray-100 rounded-full p-0.5 gap-0.5 mb-4">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
            mode === 'flower' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
          onClick={() => setMode('flower')}
        >
          По цветку
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
            mode === 'date' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
          onClick={() => { setMode('date'); setFlowerId('') }}
        >
          По дате
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

      {mode === 'date' && (
        dateGroups.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-6">Поставок нет</p>
        ) : (
          <div className="space-y-4">
            {dateGroups.map(({ date, items }) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  {formatDate(date)}
                </p>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg px-4 py-3 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.flower}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.supplier}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">+{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {mode === 'flower' && loading && (
        <p className="text-center text-gray-400 text-sm mt-6">Загрузка...</p>
      )}

      {mode === 'flower' && error && (
        <div className="text-center mt-6">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button onClick={refresh} className="text-sm text-green-600 underline">
            Повторить
          </button>
        </div>
      )}

      {mode === 'flower' && !loading && !error && movements.length > 0 && (
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
