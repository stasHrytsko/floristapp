import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HistoryPage from '../pages/HistoryPage'

vi.mock('../hooks/useFlowerStock', () => ({
  useFlowerStock: vi.fn(),
}))
vi.mock('../hooks/useMovementHistory', () => ({
  useMovementHistory: vi.fn(),
}))

import { useFlowerStock } from '../hooks/useFlowerStock'
import { useMovementHistory } from '../hooks/useMovementHistory'

const FLOWERS = [
  { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, stale: false },
  { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 0, available: 5, stale: false },
]

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFlowerStock.mockReturnValue({ flowers: FLOWERS, loading: false, error: null })
    useMovementHistory.mockReturnValue({ movements: [], loading: false, error: null, refresh: vi.fn() })
  })

  it('показывает фильтр со списком цветов', () => {
    render(<HistoryPage />)
    expect(screen.getByText('Все цветы')).toBeDefined()
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('Тюльпан')).toBeDefined()
  })

  it('показывает пустое состояние', () => {
    render(<HistoryPage />)
    expect(screen.getByText('Движений нет')).toBeDefined()
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

  it('отображает строки движений', () => {
    useMovementHistory.mockReturnValue({
      movements: [
        {
          id: '1',
          flower_id: '1',
          flowers: { name: 'Роза' },
          movement_type: 'поставка',
          quantity: 20,
          created_at: '2026-03-15T10:00:00Z',
        },
        {
          id: '2',
          flower_id: '1',
          flowers: { name: 'Роза' },
          movement_type: 'резерв',
          quantity: 5,
          created_at: '2026-03-14T09:00:00Z',
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
    render(<HistoryPage />)
    // 2 строки движений + 1 опция в фильтре = 3
    expect(screen.getAllByText('Роза')).toHaveLength(3)
    expect(screen.getByText('поставка')).toBeDefined()
    expect(screen.getByText('резерв')).toBeDefined()
    expect(screen.getByText('+20')).toBeDefined()
    expect(screen.getByText('-5')).toBeDefined()
  })

  it('передаёт flower_id в хук при выборе фильтра', () => {
    render(<HistoryPage />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '1' } })
    expect(useMovementHistory).toHaveBeenLastCalledWith('1')
  })
})
