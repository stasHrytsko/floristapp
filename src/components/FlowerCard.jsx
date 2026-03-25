import { useState } from 'react'
import { useFlowerBatches } from '../hooks/useFlowerBatches'

function dayDotClass(days) {
  if (days <= 10) return 'bg-green-500'
  if (days <= 20) return 'bg-orange-400'
  return 'bg-red-500'
}

function formatShortDate(dateStr) {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  return `${d}.${m}`
}

function FlowerDetailsSheet({ flower, onClose }) {
  const { batches, loading } = useFlowerBatches(flower.flower_id)
  const today = new Date()
  const activeBatches = (batches || []).filter((b) => b.quantity > 0)

  function daysSince(dateStr) {
    return Math.floor((today - new Date(dateStr)) / (1000 * 60 * 60 * 24))
  }

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
          <p className="font-semibold text-gray-800 text-base">{flower.name}</p>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-base font-bold text-gray-700">{flower.total ?? 0}</p>
            <p className="text-[11px] text-gray-400 leading-tight">поставлено</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-base font-bold text-blue-500">{flower.reserved ?? 0}</p>
            <p className="text-[11px] text-gray-400 leading-tight">резерв</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-base font-bold text-purple-500">{flower.sold ?? 0}</p>
            <p className="text-[11px] text-gray-400 leading-tight">продано</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-base font-bold text-green-600">{flower.available ?? 0}</p>
            <p className="text-[11px] text-gray-400 leading-tight">остаток</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center">Загрузка...</p>
        ) : activeBatches.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">Нет активных партий</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Дата</th>
                <th className="text-left pb-2 font-medium">Поставщик</th>
                <th className="text-right pb-2 font-medium">Остаток</th>
                <th className="text-right pb-2 font-medium">Дней</th>
              </tr>
            </thead>
            <tbody>
              {activeBatches.map((b) => {
                const days = daysSince(b.delivered_at)
                return (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-700">{formatShortDate(b.delivered_at)}</td>
                    <td className="py-2 text-gray-500">{b.suppliers?.name || '—'}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{b.quantity}</td>
                    <td className="py-2 text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        <span className={`w-2 h-2 rounded-full inline-block ${dayDotClass(days)}`} />
                        <span className="text-gray-600">{days}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function FlowerCard({ flower }) {
  const [showDetails, setShowDetails] = useState(false)
  const { name, available, reserved, total } = flower
  const empty = available <= 0

  return (
    <div
      onClick={() => setShowDetails(true)}
      className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer ${
        empty ? 'border-yellow-300' : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{name}</span>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              className={`text-base font-bold ${
                available < 0 ? 'text-red-600' : available === 0 ? 'text-amber-600' : 'text-green-600'
              }`}
            >
              {available}
            </span>
            <span className="text-gray-400 text-[11px] leading-tight">своб.</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base font-bold text-orange-500">{reserved}</span>
            <span className="text-gray-400 text-[11px] leading-tight">рез.</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base font-bold text-gray-600">{total}</span>
            <span className="text-gray-400 text-[11px] leading-tight">всего</span>
          </div>
        </div>
      </div>

      {showDetails && (
        <FlowerDetailsSheet flower={flower} onClose={() => setShowDetails(false)} />
      )}
    </div>
  )
}
