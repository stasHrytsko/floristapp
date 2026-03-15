import { useState } from 'react'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useMovementHistory } from '../hooks/useMovementHistory'

const TYPE_STYLES = {
  поставка: 'bg-green-100 text-green-700',
  резерв: 'bg-blue-100 text-blue-700',
  выдача: 'bg-gray-100 text-gray-600',
  списание: 'bg-red-100 text-red-700',
}

const TYPE_SIGN = {
  поставка: '+',
  резерв: '-',
  выдача: '-',
  списание: '-',
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export default function HistoryPage() {
  const [flowerId, setFlowerId] = useState('')
  const { flowers } = useFlowerStock()
  const { movements, loading, error, refresh } = useMovementHistory(flowerId || null)

  return (
    <div>
      <select
        value={flowerId}
        onChange={(e) => setFlowerId(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white mb-4"
      >
        <option value="">Все цветы</option>
        {flowers.map((f) => (
          <option key={f.flower_id} value={f.flower_id}>
            {f.name}
          </option>
        ))}
      </select>

      {loading && (
        <p className="text-center text-gray-400 text-sm mt-6">Загрузка...</p>
      )}

      {error && (
        <div className="text-center mt-6">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button onClick={refresh} className="text-sm text-green-600 underline">
            Повторить
          </button>
        </div>
      )}

      {!loading && !error && movements.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-6">Движений нет</p>
      )}

      {!loading && !error && movements.length > 0 && (
        <ul className="space-y-2">
          {movements.map((m) => {
            const typeStyle = TYPE_STYLES[m.movement_type] ?? 'bg-gray-100 text-gray-600'
            const sign = TYPE_SIGN[m.movement_type] ?? ''
            return (
              <li
                key={m.id}
                className="bg-white rounded-lg px-4 py-3 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.flowers?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(m.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeStyle}`}>
                    {m.movement_type}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {sign}{Math.abs(m.quantity)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
