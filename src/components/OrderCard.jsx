import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

const STATUS_BADGE = {
  резерв: { bg: 'bg-blue-50', color: 'text-blue-700' },
  продано: { bg: 'bg-green-50', color: 'text-green-700' },
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}



function DetailsSheet({ order, onClose }) {
  const { client_name, client_phone, delivery_type, delivery_address, ready_at, status, comment, order_items = [] } = order

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end"
      onClick={(e) => { e.stopPropagation(); onClose() }}
    >
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-800 text-base">{client_name}</p>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          {client_phone && (
            <p><span className="text-gray-400">Телефон:</span> {client_phone}</p>
          )}
          {ready_at && (
            <p><span className="text-gray-400">Дата:</span> {formatDate(ready_at)}</p>
          )}
          <p>
            <span className="text-gray-400">Тип:</span>{' '}
            {delivery_type === 'доставка' ? 'доставка' : 'самовывоз'}
            {delivery_type === 'доставка' && delivery_address && ` — ${delivery_address}`}
          </p>
          <p>
            <span className="text-gray-400">Статус:</span> {status}
          </p>
          {comment && (
            <p><span className="text-gray-400">Комментарий:</span> {comment}</p>
          )}
        </div>

        {order_items.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">Состав заказа</p>
            <ul className="space-y-1">
              {order_items.map((item, i) => (
                <li key={i} className="text-sm text-gray-700">
                  {item.flowers?.name} × {item.quantity} шт
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrderCard({ order, onClose, onEdit, onDelete }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const { client_name, status } = order
  const isRezerv = status === 'резерв'
  const badge = STATUS_BADGE[status] || { bg: 'bg-gray-100', color: 'text-gray-500' }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-base font-bold text-gray-900 leading-tight">{client_name}</span>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ml-2 whitespace-nowrap ${badge.bg} ${badge.color}`}
        >
          {status}
        </span>
      </div>

      <div className="border-t border-gray-100" />

      <div className="grid grid-cols-2 gap-2 px-4 py-3">
        <button
          aria-label="детали"
          onClick={() => setDetailsOpen(true)}
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm py-2.5 rounded-xl font-medium"
        >
          Детали
        </button>

        {isRezerv && (
          <>
            <button
              aria-label="изменить"
              onClick={() => setConfirm('edit')}
              className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 text-sm py-2.5 rounded-xl font-medium"
            >
              Изменить
            </button>
            <button
              aria-label="удалить"
              onClick={() => setConfirm('delete')}
              className="bg-red-50 text-red-600 hover:bg-red-100 text-sm py-2.5 rounded-xl font-medium"
            >
              Удалить
            </button>
            <button
              aria-label="закрыть"
              onClick={() => onClose?.(order.id)}
              className="bg-green-50 text-green-600 hover:bg-green-100 text-sm py-2.5 rounded-xl font-medium"
            >
              Закрыть
            </button>
          </>
        )}
      </div>

      {detailsOpen && (
        <DetailsSheet order={order} onClose={() => setDetailsOpen(false)} />
      )}

      {confirm === 'delete' && (
        <ConfirmDialog
          message={`Удалить заказ для «${client_name}»?`}
          onConfirm={() => { setConfirm(null); onDelete?.(order.id) }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === 'edit' && (
        <ConfirmDialog
          message={`Изменить заказ — удалить и создать новый для «${client_name}»?`}
          onConfirm={() => { setConfirm(null); onEdit?.(order) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
