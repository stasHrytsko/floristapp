import StockPage from './pages/StockPage'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white px-4 py-3 shadow sticky top-0 z-10">
        <h1 className="text-lg font-semibold">Остатки</h1>
      </header>
      <main className="px-4 py-4">
        <StockPage />
      </main>
    </div>
  )
}
