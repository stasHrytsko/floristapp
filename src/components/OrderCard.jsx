import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

const STATUS_STYLES = {
  'новый': 'bg-blue-100 text-blue-700',
  'в работе': 'bg-yellow-100 text-yellow-700',
  'готов к выдаче': 'bg-green-100 text-green-700',
  'готов к доставке': 'bg-green-100 text-green-700',
  'выдан': 'bg-gray-100 text-gray-500',
  'доставлен': 'bg-gray-100 text-gray-500',
}

function nextOrderStatus(status, deliveryType) {
  if (status === 'новый') return 'в работе'
  if (status === 'в работе') {
    return deliveryType === 'доставка' ? 'готов к доставке' : 'готов к выдаче'
  }
  if (status === 'готов к выдаче') return 'выдан'
  if (status === 'готов к доставке') return 'доставлен'
  return null
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function OrderCard({ order, onStatusChange, onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { client_name, client_phone, delivery_type, delivery_address, status, ready_at, order_items = [] } = order
  const statusStyle = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
  const isDelivery = delivery_type === 'доставка'
  const next = nextOrderStatus(status, delivery_type)

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <div className="flex items-start justify-between mb-1">
        <span className="text-[17px] font-bold text-gray-900 leading-tight">{client_name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 whitespace-nowrap ${statusStyle}`}>
          {status}
        </span>
      </div>

      {order_items.length > 0 && (
        <p className="text-[14px] text-gray-500 mb-2">
          {order_items.map((item) => `${item.flowers?.name} × ${item.quantity}`).join(', ')}
        </p>
      )}

      <div className="flex items-center gap-3 text-[13px] text-gray-400 mb-3">
        <span>{isDelivery ? '🚚 доставка' : '🏪 самовывоз'}</span>
        {ready_at && <span>к {formatDate(ready_at)}</span>}
        {isDelivery && delivery_address && <span className="truncate">{delivery_address}</span>}
        {client_phone && <span>{client_phone}</span>}
      </div>

      {next && onStatusChange && (
        <button
          onClick={() => onStatusChange(order.id, next)}
          className="w-full bg-gray-100 text-gray-700 text-sm py-2.5 rounded-xl font-medium"
        >
          → {next}
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="w-full bg-gray-100 text-red-500 text-sm py-2.5 rounded-xl font-medium mt-2"
        >
          Отменить заказ
        </button>
      )}

      {confirmOpen && (
        <ConfirmDialog
          message={`Удалить заказ клиента «${client_name}»?`}
          onConfirm={() => { setConfirmOpen(false); onDelete() }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}
