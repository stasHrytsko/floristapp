const STATUS_STYLES = {
  'новый': 'bg-blue-100 text-blue-700',
  'в работе': 'bg-yellow-100 text-yellow-700',
  'готов к выдаче': 'bg-green-100 text-green-700',
  'готов к доставке': 'bg-green-100 text-green-700',
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function OrderCard({ order }) {
  const { client_name, client_phone, delivery_type, status, ready_at, address, order_items = [] } = order
  const statusStyle = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
  const isDelivery = delivery_type === 'доставка'

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-transparent">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-medium text-gray-900">{client_name}</span>
          {client_phone && (
            <span className="block text-xs text-gray-400">{client_phone}</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
          {status}
        </span>
      </div>

      {order_items.length > 0 && (
        <p className="text-sm text-gray-600 mb-2">
          {order_items.map((item) => `${item.flowers?.name} × ${item.quantity}`).join(', ')}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>{isDelivery ? '🚚 доставка' : '🏪 самовывоз'}</span>
        {ready_at && <span>к {formatDate(ready_at)}</span>}
        {isDelivery && address && <span className="truncate">{address}</span>}
      </div>
    </div>
  )
}
