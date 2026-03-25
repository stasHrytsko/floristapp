import FlowerCard from '../components/FlowerCard'
import { useFlowerStock } from '../hooks/useFlowerStock'

export default function StockPage() {
  const { flowers, loading, error, refresh } = useFlowerStock()

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
        <div className="flex gap-4 mb-4 bg-gray-50 p-3 rounded-2xl auto-cols-auto justify-between">
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-green-600">{flowers.reduce((a, b) => a + (b.available > 0 ? b.available : 0), 0)}</span>
            <p className="text-xs text-gray-400 leading-tight">свободно</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-orange-500">{flowers.reduce((a, b) => a + b.reserved, 0)}</span>
            <p className="text-xs text-gray-400 leading-tight">резерв</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-gray-600">{flowers.reduce((a, b) => a + (b.available > 0 ? b.available : 0) + b.reserved, 0)}</span>
            <p className="text-xs text-gray-400 leading-tight">всего</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-purple-500">{flowers.length}</span>
            <p className="text-xs text-gray-400 leading-tight">видов</p>
          </div>
        </div>
      </div>

      {flowers.length === 0 ? (
        <p className="text-center text-gray-400 mt-10 text-sm">Цветы ещё не добавлены</p>
      ) : (
        <div className="space-y-3">
          {flowers.map((flower) => (
            <FlowerCard key={flower.flower_id} flower={flower} />
          ))}
        </div>
      )}
    </div>
  )
}
