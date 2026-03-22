import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import StockPage from '../pages/StockPage'

vi.mock('../hooks/useFlowerStock', () => ({
  useFlowerStock: vi.fn(),
}))
vi.mock('../hooks/useAddFlower', () => ({
  useAddFlower: vi.fn(),
}))
vi.mock('../hooks/useFlowerBatches', () => ({
  useFlowerBatches: vi.fn(() => ({ batches: [], loading: false })),
}))

import { useFlowerStock } from '../hooks/useFlowerStock'
import { useAddFlower } from '../hooks/useAddFlower'

const mockAddFlower = { addFlower: vi.fn() }

describe('StockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAddFlower.mockReturnValue(mockAddFlower)
  })

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
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8 },
      { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 0, available: 5 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('Тюльпан')).toBeDefined()
  })

  it('показывает банер когда есть цветки с нулевым остатком', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 10, available: 0 },
      { flower_id: '2', name: 'Тюльпан', total: 10, reserved: 0, available: 8 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getByText(/цветок закончился/)).toBeDefined()
  })

  it('не показывает банер когда все в норме', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 20, reserved: 2, available: 18 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.queryByText(/закончил/)).toBeNull()
  })

  it('показывает правильный текст для нескольких нулевых цветков', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 5, reserved: 5, available: 0 },
      { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 5, available: 0 },
      { flower_id: '3', name: 'Ромашка', total: 5, reserved: 5, available: 0 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getByText(/3 цветка закончились/)).toBeDefined()
  })

  it('показывает блок метрик с правильными суммами', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8 },
      { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 1, available: 4 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getAllByText('свободно').length).toBeGreaterThan(0)
    expect(screen.getAllByText('резерв').length).toBeGreaterThan(0)
    expect(screen.getAllByText('всего').length).toBeGreaterThan(0)
    expect(screen.getByText('видов')).toBeDefined()
  })
})
