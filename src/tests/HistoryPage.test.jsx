import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HistoryPage from '../pages/HistoryPage'

vi.mock('../hooks/useFlowerStock', () => ({
  useFlowerStock: vi.fn(),
}))
vi.mock('../hooks/useMovementHistory', () => ({
  useMovementHistory: vi.fn(),
}))
vi.mock('../hooks/useBatchDeliveries', () => ({
  useBatchDeliveries: vi.fn(),
}))

import { useFlowerStock } from '../hooks/useFlowerStock'
import { useMovementHistory } from '../hooks/useMovementHistory'
import { useBatchDeliveries } from '../hooks/useBatchDeliveries'

const FLOWERS = [
  { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, stale: false },
  { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 0, available: 5, stale: false },
]

const DELIVERIES = [
  {
    id: 'd1',
    delivered_at: '2026-03-17',
    suppliers: { name: 'Марина' },
    delivery_items: [
      { id: 'di1', flower_id: '1', quantity: 100, batch_id: 'b1', flowers: { name: 'Роза' } },
      { id: 'di2', flower_id: '2', quantity: 50, batch_id: 'b2', flowers: { name: 'Тюльпан' } },
    ],
  },
]

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFlowerStock.mockReturnValue({ flowers: FLOWERS, loading: false, error: null })
    useMovementHistory.mockReturnValue({ movements: [], loading: false, error: null, refresh: vi.fn() })
    useBatchDeliveries.mockReturnValue({ deliveries: DELIVERIES, loading: false, error: null })
  })

  it('показывает переключатель режимов', () => {
    render(<HistoryPage />)
    expect(screen.getByText('По цветку')).toBeDefined()
    expect(screen.getByText('По партии')).toBeDefined()
  })

  it('в режиме по цветку показывает фильтр со списком цветов', () => {
    render(<HistoryPage />)
    expect(screen.getByText('Все цветы')).toBeDefined()
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('Тюльпан')).toBeDefined()
  })

  it('показывает загрузку', () => {
    useMovementHistory.mockReturnValue({ movements: [], loading: true, error: null, refresh: vi.fn() })
    render(<HistoryPage />)
    expect(screen.getByText('Загрузка...')).toBeDefined()
  })

  it('показывает ошибку и кнопку повтора', () => {
    const refresh = vi.fn()
    useMovementHistory.mockReturnValue({ movements: [], loading: false, error: 'Ошибка сети', refresh })
    render(<HistoryPage />)
    expect(screen.getByText('Ошибка сети')).toBeDefined()
    fireEvent.click(screen.getByText('Повторить'))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('не показывает текст при пустом состоянии', () => {
    render(<HistoryPage />)
    expect(screen.queryByText('Движений нет')).toBeNull()
  })

  it('отображает строки движений с цветовыми тегами', () => {
    useMovementHistory.mockReturnValue({
      movements: [
        {
          id: '1',
          flower_id: '1',
          flowers: { name: 'Роза' },
          movement_type: 'поставка',
          quantity: 20,
          created_at: '2026-03-15T10:00:00Z',
          orders: null,
          defects: null,
          batches: null,
        },
        {
          id: '2',
          flower_id: '1',
          flowers: { name: 'Роза' },
          movement_type: 'резерв',
          quantity: 5,
          created_at: '2026-03-14T09:00:00Z',
          orders: { client_name: 'Тамара', ready_at: '2026-03-26T00:00:00Z' },
          defects: null,
          batches: null,
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
    render(<HistoryPage />)
    expect(screen.getByText('поставка')).toBeDefined()
    expect(screen.getByText('резерв')).toBeDefined()
    expect(screen.getByText('+20')).toBeDefined()
    expect(screen.getByText('-5')).toBeDefined()
  })

  it('показывает имя клиента и дату в резерве', () => {
    useMovementHistory.mockReturnValue({
      movements: [
        {
          id: '1',
          flower_id: '1',
          flowers: { name: 'Роза' },
          movement_type: 'резерв',
          quantity: 9,
          created_at: '2026-03-14T09:00:00Z',
          orders: { client_name: 'Тамара', ready_at: '2026-03-26T00:00:00Z' },
          defects: null,
          batches: null,
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
    render(<HistoryPage />)
    expect(screen.getByText(/Тамара/)).toBeDefined()
  })

  it('показывает ⚠️ брак для списания', () => {
    useMovementHistory.mockReturnValue({
      movements: [
        {
          id: '1',
          flower_id: '1',
          flowers: { name: 'Роза' },
          movement_type: 'списание',
          quantity: 5,
          created_at: '2026-03-14T09:00:00Z',
          orders: null,
          defects: { defect_type: 'гнилой' },
          batches: null,
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
    render(<HistoryPage />)
    expect(screen.getByText('⚠️ брак')).toBeDefined()
    expect(screen.getByText('списание')).toBeDefined()
  })

  it('показывает жёлтый тег для не_тот_заказ', () => {
    useMovementHistory.mockReturnValue({
      movements: [
        {
          id: '1',
          flower_id: '1',
          flowers: { name: 'Роза' },
          movement_type: 'поставка',
          quantity: 50,
          created_at: '2026-03-14T09:00:00Z',
          orders: null,
          defects: null,
          batches: { delivery_items: [{ reception_status: 'не_тот_заказ', comment: 'красные вместо белых' }] },
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
    render(<HistoryPage />)
    expect(screen.getByText('на складе')).toBeDefined()
    expect(screen.getByText('⚠️ красные вместо белых')).toBeDefined()
  })

  it('переключается в режим по партии', () => {
    render(<HistoryPage />)
    fireEvent.click(screen.getByText('По партии'))
    expect(screen.getByText('Выбрать партию')).toBeDefined()
    expect(screen.getByText(/Марина/)).toBeDefined()
  })

  it('открывает попап при выборе партии', () => {
    render(<HistoryPage />)
    fireEvent.click(screen.getByText('По партии'))
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'd1' } })
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('100 шт')).toBeDefined()
    expect(screen.getByText('50 шт')).toBeDefined()
  })

  it('передаёт flower_id в хук при выборе фильтра', () => {
    render(<HistoryPage />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '1' } })
    expect(useMovementHistory).toHaveBeenLastCalledWith('1', null)
  })
})
