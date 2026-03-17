import { useState } from 'react'
import FlowerCard from '../components/FlowerCard'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useAddFlower } from '../hooks/useAddFlower'

function lowStockLabel(n) {
  if (n === 1) return '1 цветок заканчивается'
  if (n >= 2 && n <= 4) return `${n} цветка заканчиваются`
  return `${n} цветков заканчиваются`
}

function AddFlowerModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [threshold, setThreshold] = useState('5')
  const [error, setError] = useState(null)
  const { addFlower } = useAddFlower()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await addFlower(name, parseInt(threshold, 10) || 5)
      onSave()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-800">Новый цветок</p>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Роза"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Порог предупреждения (шт)</label>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium"
          >
            Добавить
          </button>
        </form>
      </div>
    </div>
  )
}

export default function StockPage() {
  const { flowers, loading, error, refresh } = useFlowerStock()
  const { updateThreshold } = useAddFlower()
  const [showAddModal, setShowAddModal] = useState(false)

  const lowStockCount = flowers.filter((f) => f.available <= f.low_stock_threshold).length

  async function handleThresholdChange(flowerId, threshold) {
    await updateThreshold(flowerId, threshold)
    refresh()
  }

  if (loading) {
    return <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
  }

  if (error) {
    return (
      <div className="text-center mt-10">
        <p className="text-red-500 text-sm mb-3">{error}</p>
        <button onClick={refresh} className="text-sm text-green-600 underline">
          Повторить
        </button>
      </div>
    )
  }

  return (
    <div>
      {lowStockCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-yellow-700 text-sm font-medium">
            ⚠️ {lowStockLabel(lowStockCount)}
          </span>
        </div>
      )}

      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowAddModal(true)}
          className="text-sm text-green-600 font-medium"
        >
          + Добавить цветок
        </button>
      </div>

      {flowers.length === 0 ? (
        <p className="text-center text-gray-400 mt-10 text-sm">Цветы ещё не добавлены</p>
      ) : (
        <div className="space-y-3">
          {flowers.map((flower) => (
            <FlowerCard
              key={flower.flower_id}
              flower={flower}
              onThresholdChange={handleThresholdChange}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddFlowerModal
          onSave={() => { setShowAddModal(false); refresh() }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
