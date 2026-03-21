import { useState } from 'react'
import OrderCard from '../components/OrderCard'
import { useOrders } from '../hooks/useOrders'

export default function OrdersPage() {
  const { orders, loading, error, refresh, deleteOrder } = useOrders()
  const [deleteError, setDeleteError] = useState(null)

  async function handleDelete(id) {
    setDeleteError(null)
    try {
      await deleteOrder(id)
    } catch (err) {
      setDeleteError(err.message || 'Не удалось удалить заказ')
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
  }

  if (error) {
    return (
      <div className="text-center mt-10">
        <p className="text-red-500 text-sm mb-3">Не удалось загрузить заказы</p>
        <button onClick={refresh} className="text-sm text-green-600 underline">
          Повторить
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deleteError && (
        <p className="text-red-500 text-xs text-center">{deleteError}</p>
      )}
      {orders.length === 0 ? (
        <p className="text-center text-gray-400 mt-6 text-sm">Активных заказов нет</p>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onDelete={() => handleDelete(order.id)}
          />
        ))
      )}
    </div>
  )
}
