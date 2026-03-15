import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import StockPage from '../pages/StockPage'

vi.mock('../hooks/useFlowerStock', () => ({
  useFlowerStock: vi.fn(),
}))

import { useFlowerStock } from '../hooks/useFlowerStock'

describe('StockPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает загрузку', () => {
    useFlowerStock.mockReturnValue({ flowers: [], loading: true, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('показывает ошибку', () => {
    useFlowerStock.mockReturnValue({ flowers: [], loading: false, error: 'Сеть', refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getByText('Сеть')).toBeDefined()
    expect(screen.getByText(/повторить/i)).toBeDefined()
  })

  it('показывает пустой список', () => {
    useFlowerStock.mockReturnValue({ flowers: [], loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getByText(/ещё не добавлены/i)).toBeDefined()
  })

  it('рендерит карточки цветов', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, stale: false },
      { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 0, available: 5, stale: true },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('Тюльпан')).toBeDefined()
  })
})
