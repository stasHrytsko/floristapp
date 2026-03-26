import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

function formatDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}.${m}.${y}`
}

export default function DeliveryCard({ delivery, onEdit, onDelete }) {
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
          <li key={item.id} className="text-sm text-gray-600">
            <span className="text-gray-400">•</span>{' '}
            {item.flowers?.name} — {item.quantity} шт
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
    </div>
  )
}
