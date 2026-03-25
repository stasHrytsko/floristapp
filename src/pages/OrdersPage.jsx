import { useState } from 'react'
import EditOutlined from '@mui/icons-material/EditOutlined'
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'
import OrderCard from '../components/OrderCard'
import { useOrders } from '../hooks/useOrders'
import { useClients } from '../hooks/useClients'
import { useClientOrders } from '../hooks/useClientOrders'

function IconBtn({ label, className = "", children, onClick }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{ width: 44, height: 44, flexShrink: 0 }}
      className={`rounded-xl transition-colors flex items-center justify-center ${className}`}
    >
      {children}
    </button>
  )
}

function ClientHistorySheet({ client, onClose }) {
  const { orders, loading } = useClientOrders(client.name)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-800">История: {client.name}</p>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 text-center">Загрузка...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">Заказов нет</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">{o.ready_at}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{o.status}</span>
                </div>
                <div className="text-sm text-gray-600 space-y-0.5">
                  {(o.order_items || []).map((item, i) => (
                    <p key={i}>{item.flowers?.name || '—'} × {item.quantity} шт</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ClientEditForm({ client, onSave, onCancel }) {
  const [name, setName] = useState(client.name)
  const [phone, setPhone] = useState(client.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name, phone)
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-3 space-y-2 mt-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Имя"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        autoFocus
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Телефон"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green-600 text-white text-sm py-2 rounded-xl disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 rounded-xl"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}

function ClientsTab() {
  const { clients, loading, error, updateClient } = useClients()
  const [editingId, setEditingId] = useState(null)
  const [historyClient, setHistoryClient] = useState(null)

  async function handleSave(id, newName, newPhone) {
    await updateClient(id, newName, newPhone)
    setEditingId(null)
  }

  if (loading) return <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
  if (error) return <p className="text-center text-red-500 mt-10 text-sm">Не удалось загрузить клиентов</p>

  return (
    <div>
      {clients.length === 0 ? (
        <p className="text-center text-gray-400 mt-6 text-sm">Клиентов нет</p>
      ) : (
        <ul className="space-y-3">
          {clients.map((c) => (
            <li key={c.id || c.name} className="bg-white rounded-2xl px-4 py-4 mb-3 border border-gray-100">
              <p className="text-base font-bold text-gray-900">{c.name}</p>
              <p className="text-sm text-gray-400 mb-4">{c.phone || '\u00a0'}</p>
              {editingId === (c.id || c.name) ? (
                <ClientEditForm
                  client={c}
                  onSave={(name, phone) => handleSave(c.id || c.name, name, phone)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex gap-2">
                  <IconBtn
                    label="изменить"
                    className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    onClick={() => setEditingId(c.id || c.name)}
                  >
                    <EditOutlined sx={{ fontSize: 20 }} />
                  </IconBtn>
                  <IconBtn
                    label="история"
                    className="bg-purple-50 text-purple-600 hover:bg-purple-100"
                    onClick={() => setHistoryClient(c)}
                  >
                    <HistoryOutlined sx={{ fontSize: 20 }} />
                  </IconBtn>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {historyClient && (
        <ClientHistorySheet client={historyClient} onClose={() => setHistoryClient(null)} />
      )}
    </div>
  )
}

export default function OrdersPage({ onRecreate, onCreateNew }) {
  const { orders, loading, error, refresh, closeOrder, deleteOrder } = useOrders()
  const [actionError, setActionError] = useState(null)
  const [mode, setMode] = useState('orders')

  async function handleClose(id) {
    setActionError(null)
    try {
      await closeOrder(id)
    } catch (err) {
      setActionError(err.message || 'Не удалось закрыть заказ')
    }
  }

  async function handleEdit(order) {
    setActionError(null)
    try {
      await deleteOrder(order.id)
    } catch {
      // продолжаем даже при ошибке удаления
    }
    onRecreate?.(order.client_name, order.client_phone)
  }

  async function handleDelete(id) {
    setActionError(null)
    try {
      await deleteOrder(id)
    } catch (err) {
      setActionError(err.message || 'Не удалось удалить заказ')
    }
  }

  return (
    <div>
      <div className="flex bg-gray-200 rounded-xl p-1 gap-1 mb-4">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
          onClick={() => setMode('orders')}
        >
          Заказы
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'clients' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
          onClick={() => setMode('clients')}
        >
          Клиенты
        </button>
      </div>

      {mode === 'clients' && <ClientsTab />}

      {mode === 'orders' && (
        <>
          <button
            onClick={onCreateNew}
            className="w-full bg-green-600 text-white text-sm font-medium py-3 rounded-xl mb-4"
          >
            Создать заказ
          </button>

          {loading && (
            <p className="text-center text-gray-400 mt-10 text-sm">Загрузка...</p>
          )}
          {error && (
            <div className="text-center mt-10">
              <p className="text-red-500 text-sm mb-3">Не удалось загрузить заказы</p>
              <button onClick={refresh} className="text-sm text-green-600 underline">
                Повторить
              </button>
            </div>
          )}
          {!loading && !error && (
            <div className="space-y-3">
              {actionError && (
                <p className="text-red-500 text-xs text-center">{actionError}</p>
              )}
              {orders.length === 0 ? (
                <p className="text-center text-gray-400 mt-6 text-sm">Активных заказов нет</p>
              ) : (
                orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClose={handleClose}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
