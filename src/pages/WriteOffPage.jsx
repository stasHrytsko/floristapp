import { useState, useEffect } from 'react'
import { useWriteOffs } from '../hooks/useWriteOffs'
import { useWriteOff } from '../hooks/useWriteOff'
import { useFlowerStock } from '../hooks/useFlowerStock'

function formatDate(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function groupByDate(items) {
  const groups = {}
  for (const item of items) {
    const key = formatDate(item.created_at)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return Object.entries(groups)
}

export default function WriteOffPage({ addFormOpen, onAddFormClose }) {
  const [showForm, setShowForm] = useState(false)
  const [flowerId, setFlowerId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const { writeOffs, loading, error, refresh } = useWriteOffs()
  const { createWriteOff } = useWriteOff()
  const { flowers } = useFlowerStock()

  useEffect(() => {
    if (addFormOpen) setShowForm(true)
  }, [addFormOpen])

  function handleClose() {
    setShowForm(false)
    setFlowerId('')
    setQuantity('')
    setSaveError(null)
    onAddFormClose?.()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await createWriteOff({ flowerId, quantity: Number(quantity) })
      refresh()
      handleClose()
    } catch (err) {
      setSaveError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const isValid = flowerId && Number(quantity) > 0
  const groups = groupByDate(writeOffs)

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-green-600 text-white text-sm py-3 rounded-xl font-medium"
      >
        + Списать
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">Новое списание</p>
            <button type="button" onClick={handleClose} className="text-gray-400 text-lg leading-none">
              ✕
            </button>
          </div>

          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}

          <div>
            <label className="block text-xs text-gray-500 mb-1">Цветок</label>
            <select
              value={flowerId}
              onChange={(e) => setFlowerId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Выберите цветок</option>
              {flowers.map((f) => (
                <option key={f.flower_id} value={f.flower_id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Количество</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              placeholder="шт"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !isValid}
            className="w-full bg-green-600 text-white text-sm py-3 rounded-xl disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      )}

      {loading && <p className="text-center text-gray-400 text-sm">Загрузка...</p>}
      {error && <p className="text-center text-red-500 text-sm">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-4">Списаний нет</p>
      )}

      {groups.map(([date, items]) => (
        <div key={date}>
          <p className="text-xs text-gray-400 font-medium mb-2">{date}</p>
          <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 space-y-1.5">
            {items.map((w) => (
              <p key={w.id} className="text-sm text-gray-700">
                <span className="text-gray-400">•</span>{' '}
                {w.flowers?.name} — {w.quantity} шт
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
