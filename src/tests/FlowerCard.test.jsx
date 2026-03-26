import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FlowerCard from '../components/FlowerCard'

vi.mock('../hooks/useFlowerBatches', () => ({
  useFlowerBatches: vi.fn(() => ({ batches: [], loading: false })),
}))

import { useFlowerBatches } from '../hooks/useFlowerBatches'

const base = {
  flower_id: '1',
  name: 'Роза',
  total: 50,
  reserved: 10,
  available: 40,
  sold: 5,
}

describe('FlowerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFlowerBatches.mockReturnValue({ batches: [], loading: false })
  })

  it('отображает название и остатки', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('40')).toBeDefined()
    expect(screen.getByText('10')).toBeDefined()
    expect(screen.getByText('50')).toBeDefined()
  })

  it('не имеет жёлтого бордера при available > 0', () => {
    const { container } = render(<FlowerCard flower={base} />)
    expect(container.querySelector('.border-yellow-300')).toBeNull()
  })

  it('имеет жёлтый бордер при available === 0', () => {
    const { container } = render(<FlowerCard flower={{ ...base, available: 0 }} />)
    expect(container.querySelector('.border-yellow-300')).not.toBeNull()
  })

  it('имеет жёлтый бордер при available < 0', () => {
    const { container } = render(<FlowerCard flower={{ ...base, available: -2 }} />)
    expect(container.querySelector('.border-yellow-300')).not.toBeNull()
  })

  it('не показывает текстовых бейджей при available === 0', () => {
    render(<FlowerCard flower={{ ...base, available: 0 }} />)
    expect(screen.queryByText(/закончился/)).toBeNull()
    expect(screen.queryByText(/дефицит/)).toBeNull()
    expect(screen.queryByText(/⚠️/)).toBeNull()
  })

  it('открывает попап при тапе на карточку', () => {
    render(<FlowerCard flower={base} />)
    fireEvent.click(screen.getByText('Роза'))
    expect(screen.getAllByText('Роза').length).toBeGreaterThanOrEqual(2)
  })

  it('попап показывает плитки поставл. / списано / резерв / продано / остаток', () => {
    render(<FlowerCard flower={{ ...base, writeoff: 3 }} />)
    fireEvent.click(screen.getByText('Роза'))
    expect(screen.getByText('поставл.')).toBeDefined()
    expect(screen.getByText('списано')).toBeDefined()
    expect(screen.getAllByText('резерв').length).toBeGreaterThan(0)
    expect(screen.getByText('продано')).toBeDefined()
    expect(screen.getByText('остаток')).toBeDefined()
  })

  it('попап показывает партии в таблице', () => {
    useFlowerBatches.mockReturnValue({
      batches: [
        { id: 'b1', quantity: 20, delivered_at: '2026-03-10', suppliers: { name: 'Флора' } },
      ],
      loading: false,
    })
    render(<FlowerCard flower={base} />)
    fireEvent.click(screen.getByText('Роза'))
    expect(screen.getByText('Флора')).toBeDefined()
    expect(screen.getByText('20')).toBeDefined()
  })

  it('попап не показывает партии с quantity === 0', () => {
    useFlowerBatches.mockReturnValue({
      batches: [
        { id: 'b1', quantity: 0, delivered_at: '2026-03-10', suppliers: { name: 'Флора' } },
      ],
      loading: false,
    })
    render(<FlowerCard flower={base} />)
    fireEvent.click(screen.getByText('Роза'))
    expect(screen.queryByText('Флора')).toBeNull()
    expect(screen.getByText('Нет активных партий')).toBeDefined()
  })

  it('закрывает попап при нажатии на ✕', () => {
    render(<FlowerCard flower={base} />)
    fireEvent.click(screen.getByText('Роза'))
    expect(screen.getAllByText('Роза').length).toBeGreaterThanOrEqual(2)
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.getAllByText('Роза').length).toBe(1)
  })
})
