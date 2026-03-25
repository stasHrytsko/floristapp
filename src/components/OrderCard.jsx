import { useState } from 'react'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import ConfirmDialog from './ConfirmDialog'

const STATUS_BADGE = {
  резерв: { bg: '#eff6ff', color: '#1d4ed8' },
  продано: { bg: '#f0fdf4', color: '#15803d' },
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function IconBtn({ label, bg, color, size = 44, children, onClick }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{ width: size, height: size, background: bg, color, borderRadius: 10, flexShrink: 0 }}
      className="flex items-center justify-center"
    >
      {children}
    </button>
  )
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
  const badge = STATUS_BADGE[status] || { bg: '#f3f4f6', color: '#6b7280' }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[17px] font-bold text-gray-900 leading-tight">{client_name}</span>
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-medium ml-2 whitespace-nowrap"
          style={{ background: badge.bg, color: badge.color }}
        >
          {status}
        </span>
      </div>

      <div className="border-t border-gray-100" />

      <div className="flex items-center px-3 py-2 gap-1.5">
        <IconBtn label="детали" bg="#eff6ff" color="#1d4ed8" onClick={() => setDetailsOpen(true)}>
          <InfoOutlined sx={{ fontSize: 20 }} />
        </IconBtn>

        {isRezerv && (
          <>
            <IconBtn label="изменить" bg="#fefce8" color="#a16207" onClick={() => setConfirm('edit')}>
              <EditOutlined sx={{ fontSize: 20 }} />
            </IconBtn>
            <IconBtn label="удалить" bg="#fef2f2" color="#dc2626" onClick={() => setConfirm('delete')}>
              <DeleteOutlined sx={{ fontSize: 20 }} />
            </IconBtn>
          </>
        )}

        <div className="flex-1" />

        {isRezerv && (
          <IconBtn label="закрыть" bg="#f0fdf4" color="#16a34a" size={52} onClick={() => onClose?.(order.id)}>
            <CheckCircleOutlined sx={{ fontSize: 24 }} />
          </IconBtn>
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
