import { useState } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import StockPage from './pages/StockPage'
import OrdersPage from './pages/OrdersPage'
import DeliveryPage from './pages/DeliveryPage'
import NewOrderPage from './pages/NewOrderPage'
import WriteOffPage from './pages/WriteOffPage'

import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import DeleteOutline from '@mui/icons-material/DeleteOutline'

const TABS = [
  { id: 'stock', label: 'Остатки', icon: <Inventory2Outlined sx={{ fontSize: 22 }} /> },
  { id: 'orders', label: 'Заказы', icon: <FormatListBulletedOutlined sx={{ fontSize: 22 }} /> },
  { id: 'delivery', label: 'Поставки', icon: <LocalShippingOutlined sx={{ fontSize: 22 }} /> },
  { id: 'writeoff', label: 'Списание', icon: <DeleteOutline sx={{ fontSize: 22 }} /> },
]

const PAGE_TITLES = {
  stock: 'Остатки',
  neworder: 'Новый заказ',
  orders: 'Заказы',
  delivery: 'Поставки',
  writeoff: 'Списание',
}

export default function App() {
  const [tab, setTab] = useState('stock')
  const online = useOnlineStatus()
  const [newOrderPrefill, setNewOrderPrefill] = useState(null)

  function handleRecreateOrder(clientName, clientPhone) {
    setNewOrderPrefill({ clientName, clientPhone })
    setTab('neworder')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-medium text-gray-900 leading-tight">{PAGE_TITLES[tab]}</h1>
      </header>

      {!online && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <p className="text-xs text-yellow-700">Нет интернета — только просмотр</p>
        </div>
      )}

      <main className="px-4 py-4 flex-1">
        <ErrorBoundary>
          {tab === 'stock' && <StockPage />}
          {tab === 'neworder' && (
            <NewOrderPage
              initialClientName={newOrderPrefill?.clientName || ''}
              initialClientPhone={newOrderPrefill?.clientPhone || ''}
              onBack={() => { setNewOrderPrefill(null); setTab('orders') }}
            />
          )}
          {tab === 'orders' && (
            <OrdersPage
              onRecreate={handleRecreateOrder}
              onCreateNew={() => setTab('neworder')}
            />
          )}
          {tab === 'delivery' && <DeliveryPage />}
          {tab === 'writeoff' && <WriteOffPage />}
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
              <span className="text-xs font-medium leading-none mt-1">{t.label}</span>
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
