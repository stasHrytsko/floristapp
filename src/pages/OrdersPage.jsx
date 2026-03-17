import OrderCard from '../components/OrderCard'
import { useOrders } from '../hooks/useOrders'

export default function OrdersPage({ onNewOrder }) {
  const { orders, loading, error, refresh } = useOrders()

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
    <div className="space-y-3">
      <button
        onClick={onNewOrder}
        className="w-full bg-green-600 text-white text-sm py-3 rounded-xl"
      >
        + Новый заказ
      </button>
      {orders.length === 0 ? (
        <p className="text-center text-gray-400 mt-6 text-sm">Активных заказов нет</p>
      ) : (
        orders.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  )
}
