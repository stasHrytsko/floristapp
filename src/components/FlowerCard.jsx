export default function FlowerCard({ flower }) {
  const { name, total, reserved, available, stale } = flower
  const warn = available < 0 || stale

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border ${warn ? 'border-amber-400' : 'border-transparent'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{name}</span>
        {warn && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            ⚠️ {available < 0 ? 'дефицит' : 'скоро завянет'}
          </span>
        )}
      </div>
      <div className="flex gap-4 text-sm">
        <div className="flex flex-col items-center">
          <span className={`text-lg font-bold ${available < 0 ? 'text-red-600' : 'text-green-600'}`}>
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
    </div>
  )
}
