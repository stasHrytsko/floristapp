import { useState } from 'react'
import { useFlowerBatches } from '../hooks/useFlowerBatches'

function FlowerDetailsSheet({ flower, onClose }) {
  const { batches, loading } = useFlowerBatches(flower.flower_id)
  const today = new Date()

  function daysSince(dateStr) {
    const d = new Date(dateStr)
    return Math.floor((today - d) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-800">Партии: {flower.name}</p>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 text-center">Загрузка...</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">Нет партий</p>
        ) : (
          <div className="space-y-3">
            {batches.map((b) => (
              <div key={b.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">{b.delivered_at}</span>
                  <span className="font-medium text-gray-900">{b.quantity} шт</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{b.suppliers?.name || '—'}</span>
                  <span>{daysSince(b.delivered_at)} дн. на складе</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FlowerCard({ flower }) {
  const [showDetails, setShowDetails] = useState(false)

  const { name, total, reserved, available } = flower
  const empty = available <= 0

  return (
    <div
      className={`bg-white rounded-xl p-4 shadow-sm border ${
        empty ? 'border-amber-400' : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{name}</span>
        {empty && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            ⚠️ {available < 0 ? 'дефицит' : 'закончился'}
          </span>
        )}
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex flex-col items-center">
          <span
            className={`text-lg font-bold ${
              available < 0 ? 'text-red-600' : available === 0 ? 'text-amber-600' : 'text-green-600'
            }`}
          >
            {available}
          </span>
          <span className="text-gray-400 text-xs">свободно</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-yellow-600">{reserved}</span>
          <span className="text-gray-400 text-xs">резерв</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-gray-600">{total}</span>
          <span className="text-gray-400 text-xs">всего</span>
        </div>
      </div>

      <div className="mt-3">
        <button
          onClick={() => setShowDetails(true)}
          className="text-xs text-blue-500 underline"
        >
          Детали
        </button>
      </div>

      {showDetails && (
        <FlowerDetailsSheet flower={flower} onClose={() => setShowDetails(false)} />
      )}
    </div>
  )
}
