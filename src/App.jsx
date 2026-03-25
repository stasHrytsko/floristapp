import { useState } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import StockPage from './pages/StockPage'
import OrdersPage from './pages/OrdersPage'
import DeliveryPage from './pages/DeliveryPage'
import NewOrderPage from './pages/NewOrderPage'
import WriteOffPage from './pages/WriteOffPage'

const TABS = [
  {
    id: 'stock',
    label: 'Остатки',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z" />
      </svg>
    ),
  },
  {
    id: 'orders',
    label: 'Заказы',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    ),
  },
  {
    id: 'delivery',
    label: 'Поставки',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-1.5 1.5 1.96 2.5H17V9.5h1.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.22-3c-.55-.61-1.35-1-2.22-1s-1.67.39-2.22 1H3V6h12v9H8.22zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
      </svg>
    ),
  },
  {
    id: 'writeoff',
    label: 'Списание',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z" />
      </svg>
    ),
  },
]

const PAGE_TITLES = {
  stock: 'Остатки',
  neworder: 'Новый заказ',
  orders: 'Заказы',
  delivery: 'Поставки',
  writeoff: 'Списание',
}

const TABS_WITH_ADD = ['stock', 'orders', 'delivery', 'writeoff']

export default function App() {
  const [tab, setTab] = useState('stock')
  const online = useOnlineStatus()
  const [stockAddOpen, setStockAddOpen] = useState(false)
  const [deliveryAddOpen, setDeliveryAddOpen] = useState(false)
  const [writeoffAddOpen, setWriteoffAddOpen] = useState(false)
  const [newOrderPrefill, setNewOrderPrefill] = useState(null)

  function handleRecreateOrder(clientName, clientPhone) {
    setNewOrderPrefill({ clientName, clientPhone })
    setTab('neworder')
  }

  function handleHeaderAdd() {
    if (tab === 'stock') setStockAddOpen(true)
    else if (tab === 'orders') setTab('neworder')
    else if (tab === 'delivery') setDeliveryAddOpen(true)
    else if (tab === 'writeoff') setWriteoffAddOpen(true)
  }

  const showAddBtn = TABS_WITH_ADD.includes(tab)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <h1 className="text-[22px] font-medium text-gray-900 leading-tight">{PAGE_TITLES[tab]}</h1>
        {showAddBtn && (
          <button
            onClick={handleHeaderAdd}
            className="bg-green-500 text-white text-sm font-medium px-4 py-1.5 rounded-full leading-none"
          >
            +
          </button>
        )}
      </header>

      {!online && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <p className="text-xs text-yellow-700">Нет интернета — только просмотр</p>
        </div>
      )}

      <main className="px-4 py-4 flex-1">
        <ErrorBoundary>
          {tab === 'stock' && (
            <StockPage addModalOpen={stockAddOpen} onAddClose={() => setStockAddOpen(false)} />
          )}
          {tab === 'neworder' && (
            <NewOrderPage
              initialClientName={newOrderPrefill?.clientName || ''}
              initialClientPhone={newOrderPrefill?.clientPhone || ''}
              onBack={() => { setNewOrderPrefill(null); setTab('orders') }}
            />
          )}
          {tab === 'orders' && <OrdersPage onRecreate={handleRecreateOrder} />}
          {tab === 'delivery' && (
            <DeliveryPage
              addFormOpen={deliveryAddOpen}
              onAddFormClose={() => setDeliveryAddOpen(false)}
            />
          )}
          {tab === 'writeoff' && (
            <WriteOffPage
              addFormOpen={writeoffAddOpen}
              onAddFormClose={() => setWriteoffAddOpen(false)}
            />
          )}
        </ErrorBoundary>
      </main>

      <nav className="sticky bottom-0 bg-white border-t border-gray-100 flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 flex flex-col items-center gap-0.5"
          >
            <span
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-colors ${
                tab === t.id ? 'bg-green-50 text-green-600' : 'text-gray-400'
              }`}
            >
              {t.icon}
              <span className="text-[11px] font-medium leading-none">{t.label}</span>
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
