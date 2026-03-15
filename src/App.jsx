import { useState } from 'react'
import StockPage from './pages/StockPage'
import HistoryPage from './pages/HistoryPage'

const TABS = [
  { id: 'stock', label: 'Остатки' },
  { id: 'history', label: 'История' },
]

const PAGE_TITLES = {
  stock: 'Остатки',
  history: 'История движения',
}

export default function App() {
  const [tab, setTab] = useState('stock')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-green-600 text-white px-4 py-3 shadow sticky top-0 z-10">
        <h1 className="text-lg font-semibold">{PAGE_TITLES[tab]}</h1>
      </header>
      <main className="px-4 py-4 flex-1">
        {tab === 'stock' && <StockPage />}
        {tab === 'history' && <HistoryPage />}
      </main>
      <nav className="sticky bottom-0 bg-white border-t border-gray-200 flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium ${
              tab === t.id
                ? 'text-green-600 border-t-2 border-green-600'
                : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
