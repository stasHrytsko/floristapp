import { useState } from 'react'
import { useDefect } from '../hooks/useDefect'
import ConfirmDialog from './ConfirmDialog'

function formatDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}.${m}.${y}`
}

function DefectSheet({ item, delivery, onClose, onDone }) {
  const { markDefect } = useDefect()
  const [qty, setQty] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await markDefect({
        deliveryItem: item,
        supplierId: delivery.supplier_id,
        deliveredAt: delivery.delivered_at,
        defectQty: Number(qty),
        comment: comment.trim() || null,
      })
      onDone()
    } catch (err) {
      setError(err.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-800">Брак: {item.flowers?.name}</p>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Количество брака</label>
            <input
              type="number"
              min="1"
              max={item.quantity}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
              autoFocus
              placeholder="шт"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Комментарий</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Необязательно"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !qty || Number(qty) <= 0}
            className="w-full bg-red-500 text-white text-sm py-3 rounded-xl disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Записать брак'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function DeliveryCard({ delivery, onEdit, onDelete, onRefresh }) {
  const [defectItem, setDefectItem] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const { suppliers, delivered_at, delivery_items = [] } = delivery
  const canDelete = !delivery_items.some((i) => i.batch_id)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDelete(delivery.id)
    } catch (err) {
      setDeleteError(err.message || 'Не удалось удалить')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-700">
          <span className="text-gray-400">{formatDate(delivered_at)}</span>
          {' — '}
          <span className="font-semibold">{suppliers?.name}</span>
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onEdit(delivery)}
            className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
          >
            Изменить
          </button>
          <button
            onClick={canDelete ? () => setConfirmDelete(true) : undefined}
            disabled={!canDelete || deleting}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
              canDelete ? 'bg-gray-100 text-red-500' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            Удалить
          </button>
        </div>
      </div>

      {deleteError && <p className="text-xs text-red-500 mb-1">{deleteError}</p>}

      <ul className="space-y-1.5 mt-1">
        {delivery_items.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              <span className="text-gray-400">•</span>{' '}
              {item.flowers?.name} — {item.quantity} шт
              {item.defect_qty > 0 && (
                <span className="text-red-400 text-xs ml-1">(брак: {item.defect_qty})</span>
              )}
            </span>
            <button
              onClick={() => setDefectItem(item)}
              className="text-xs bg-red-50 text-red-500 px-2.5 py-1 rounded-lg font-medium ml-2 whitespace-nowrap"
            >
              Брак
            </button>
          </li>
        ))}
      </ul>

      {confirmDelete && (
        <ConfirmDialog
          message="Удалить поставку?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {defectItem && (
        <DefectSheet
          item={defectItem}
          delivery={delivery}
          onClose={() => setDefectItem(null)}
          onDone={() => {
            setDefectItem(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
