import { useState } from 'react'
import FlowerCard from '../components/FlowerCard'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useAddFlower } from '../hooks/useAddFlower'

function emptyLabel(n) {
  if (n === 1) return 'цветок закончился'
  if (n >= 2 && n <= 4) return `${n} цветка закончились`
  return `${n} цветков закончились`
}

function AddFlowerModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const { addFlower } = useAddFlower()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await addFlower(name)
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

export default function StockPage({ addModalOpen, onAddClose }) {
  const { flowers, loading, error, refresh } = useFlowerStock()

  const emptyCount = flowers.filter((f) => f.available <= 0).length
  const totalAvailable = flowers.reduce((s, f) => s + (f.available || 0), 0)
  const totalReserved = flowers.reduce((s, f) => s + (f.reserved || 0), 0)
  const totalAll = flowers.reduce((s, f) => s + (f.total || 0), 0)

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
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
          <p className="text-lg font-bold text-green-600">{totalAvailable}</p>
          <p className="text-[11px] text-gray-400 leading-tight">свободно</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
          <p className="text-lg font-bold text-yellow-500">{totalReserved}</p>
          <p className="text-[11px] text-gray-400 leading-tight">резерв</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
          <p className="text-lg font-bold text-gray-600">{totalAll}</p>
          <p className="text-[11px] text-gray-400 leading-tight">всего</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
          <p className="text-lg font-bold text-gray-600">{flowers.length}</p>
          <p className="text-[11px] text-gray-400 leading-tight">видов</p>
        </div>
      </div>

      {emptyCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-amber-700 text-sm font-medium">
            ⚠️ {emptyLabel(emptyCount)}
          </span>
        </div>
      )}

      {flowers.length === 0 ? (
        <p className="text-center text-gray-400 mt-10 text-sm">Цветы ещё не добавлены</p>
      ) : (
        <div className="space-y-3">
          {flowers.map((flower) => (
            <FlowerCard key={flower.flower_id} flower={flower} />
          ))}
        </div>
      )}

      {addModalOpen && (
        <AddFlowerModal
          onSave={() => { onAddClose(); refresh() }}
          onClose={onAddClose}
        />
      )}
    </div>
  )
}
