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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Дата</th>
                <th className="text-left pb-2 font-medium">Поставщик</th>
                <th className="text-right pb-2 font-medium">Кол-во</th>
                <th className="text-right pb-2 font-medium">Дней на складе</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700">{b.delivered_at}</td>
                  <td className="py-2 text-gray-500">{b.suppliers?.name || '—'}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{b.quantity} шт</td>
                  <td className="py-2 text-right text-gray-400">{daysSince(b.delivered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
