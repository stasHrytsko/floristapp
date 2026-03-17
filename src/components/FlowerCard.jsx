import { useState } from 'react'

export default function FlowerCard({ flower, onThresholdChange }) {
  const [editing, setEditing] = useState(false)
  const [thresholdInput, setThresholdInput] = useState('')

  const { name, total, reserved, available, stale, low_stock_threshold = 5 } = flower
  const deficit = available < 0
  const lowStock = !deficit && available <= low_stock_threshold

  function startEdit() {
    setThresholdInput(String(low_stock_threshold))
    setEditing(true)
  }

  function saveThreshold() {
    const val = parseInt(thresholdInput, 10)
    if (!isNaN(val) && val >= 0) {
      onThresholdChange?.(flower.flower_id, val)
    }
    setEditing(false)
  }

  return (
    <div
      className={`bg-white rounded-xl p-4 shadow-sm border ${
        deficit || stale || lowStock ? 'border-amber-400' : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{name}</span>
        <div className="flex gap-1 flex-wrap justify-end">
          {lowStock && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
              ⚠️ осталось {available} шт, порог {low_stock_threshold}
            </span>
          )}
          {(deficit || stale) && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              ⚠️ {deficit ? 'дефицит' : 'скоро завянет'}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex flex-col items-center">
          <span
            className={`text-lg font-bold ${
              deficit ? 'text-red-600' : lowStock ? 'text-yellow-600' : 'text-green-600'
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

      <div className="mt-3 flex items-center gap-2">
        {editing ? (
          <>
            <span className="text-xs text-gray-500">Порог:</span>
            <input
              type="number"
              min="0"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs"
              autoFocus
            />
            <button
              onClick={saveThreshold}
              className="text-xs text-green-600 font-medium"
            >
              Сохранить
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400"
            >
              Отмена
            </button>
          </>
        ) : (
          <button onClick={startEdit} className="text-xs text-gray-400">
            порог: {low_stock_threshold}
          </button>
        )}
      </div>
    </div>
  )
}
