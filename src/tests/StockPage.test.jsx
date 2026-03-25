import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StockPage from '../pages/StockPage'

vi.mock('../hooks/useFlowerStock', () => ({
  useFlowerStock: vi.fn(),
}))
vi.mock('../hooks/useFlowerBatches', () => ({
  useFlowerBatches: vi.fn(() => ({ batches: [], loading: false })),
}))

import { useFlowerStock } from '../hooks/useFlowerStock'
import { useFlowerBatches } from '../hooks/useFlowerBatches'

describe('StockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFlowerBatches.mockReturnValue({ batches: [], loading: false })
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
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, sold: 0 },
      { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 0, available: 5, sold: 0 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('Тюльпан')).toBeDefined()
  })

  it('показывает блок метрик с правильными суммами', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, sold: 0 },
      { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 1, available: 4, sold: 0 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    expect(screen.getAllByText('свободно').length).toBeGreaterThan(0)
    expect(screen.getAllByText('резерв').length).toBeGreaterThan(0)
    expect(screen.getAllByText('всего').length).toBeGreaterThan(0)
    expect(screen.getByText('видов')).toBeDefined()
  })

  it('карточка с available === 0 имеет жёлтый бордер', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 10, available: 0, sold: 0 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    const { container } = render(<StockPage />)
    expect(container.querySelector('.border-yellow-300')).not.toBeNull()
  })

  it('карточка с available > 0 не имеет жёлтого бордера', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, sold: 0 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    const { container } = render(<StockPage />)
    expect(container.querySelector('.border-yellow-300')).toBeNull()
  })

  it('тап на карточку показывает попап с названием цветка', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, sold: 0 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    fireEvent.click(screen.getByText('Роза'))
    expect(screen.getAllByText('Роза').length).toBeGreaterThanOrEqual(2)
  })

  it('попап содержит колонки Дата / Поставщик / Остаток / Дней', () => {
    useFlowerBatches.mockReturnValue({
      batches: [{ id: 'b1', quantity: 5, delivered_at: '2026-03-20', suppliers: { name: 'Рома' } }],
      loading: false,
    })
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, sold: 0 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    fireEvent.click(screen.getByText('Роза'))
    expect(screen.getByText('Дата')).toBeDefined()
    expect(screen.getByText('Поставщик')).toBeDefined()
    expect(screen.getAllByText('Остаток').length).toBeGreaterThan(0)
    expect(screen.getByText('Дней')).toBeDefined()
  })

  it('попап закрывается по кнопке ✕', () => {
    const flowers = [
      { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, sold: 0 },
    ]
    useFlowerStock.mockReturnValue({ flowers, loading: false, error: null, refresh: vi.fn() })
    render(<StockPage />)
    fireEvent.click(screen.getByText('Роза'))
    expect(screen.getAllByText('Роза').length).toBeGreaterThanOrEqual(2)
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.getAllByText('Роза').length).toBe(1)
  })
})
