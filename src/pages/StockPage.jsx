import FlowerCard from '../components/FlowerCard'
import { useFlowerStock } from '../hooks/useFlowerStock'

export default function StockPage() {
  const { flowers, loading, error, refresh } = useFlowerStock()

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

  if (flowers.length === 0) {
    return (
      <p className="text-center text-gray-400 mt-10 text-sm">
        Цветы ещё не добавлены
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {flowers.map((flower) => (
        <FlowerCard key={flower.flower_id} flower={flower} />
      ))}
    </div>
  )
}
