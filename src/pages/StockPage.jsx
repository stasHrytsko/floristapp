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
