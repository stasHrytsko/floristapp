import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FlowerCard from '../components/FlowerCard'

vi.mock('../hooks/useFlowerBatches', () => ({
  useFlowerBatches: vi.fn(() => ({ batches: [], loading: false })),
}))

const base = {
  flower_id: '1',
  name: 'Роза',
  total: 50,
  reserved: 10,
  available: 40,
}

describe('FlowerCard', () => {
  it('отображает название и остатки', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('40')).toBeDefined()
    expect(screen.getByText('10')).toBeDefined()
    expect(screen.getByText('50')).toBeDefined()
  })

  it('не показывает предупреждение при наличии остатка', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.queryByText(/⚠️/)).toBeNull()
  })

  it('показывает предупреждение "закончился" при available === 0', () => {
    render(<FlowerCard flower={{ ...base, available: 0 }} />)
    expect(screen.getByText(/закончился/)).toBeDefined()
  })

  it('показывает предупреждение "дефицит" при available < 0', () => {
    render(<FlowerCard flower={{ ...base, available: -2 }} />)
    expect(screen.getByText(/дефицит/)).toBeDefined()
  })

  it('не показывает предупреждение при available > 0', () => {
    render(<FlowerCard flower={{ ...base, available: 1 }} />)
    expect(screen.queryByText(/⚠️/)).toBeNull()
  })

  it('показывает кнопку Детали', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.getByText('Детали')).toBeDefined()
  })

  it('открывает bottom sheet при нажатии на Детали', async () => {
    const { useFlowerBatches } = await import('../hooks/useFlowerBatches')
    useFlowerBatches.mockReturnValue({ batches: [], loading: false })

    render(<FlowerCard flower={base} />)
    fireEvent.click(screen.getByText('Детали'))
    expect(screen.getByText(/Партии: Роза/)).toBeDefined()
  })

  it('показывает партии в bottom sheet', async () => {
    const { useFlowerBatches } = await import('../hooks/useFlowerBatches')
    useFlowerBatches.mockReturnValue({
      batches: [
        { id: 'b1', quantity: 20, delivered_at: '2026-03-10', suppliers: { name: 'Флора' } },
      ],
      loading: false,
    })

    render(<FlowerCard flower={base} />)
    fireEvent.click(screen.getByText('Детали'))
    expect(screen.getByText('Флора')).toBeDefined()
    expect(screen.getByText('20 шт')).toBeDefined()
  })

  it('закрывает bottom sheet при нажатии на ✕', async () => {
    const { useFlowerBatches } = await import('../hooks/useFlowerBatches')
    useFlowerBatches.mockReturnValue({ batches: [], loading: false })

    render(<FlowerCard flower={base} />)
    fireEvent.click(screen.getByText('Детали'))
    expect(screen.getByText(/Партии: Роза/)).toBeDefined()
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByText(/Партии: Роза/)).toBeNull()
  })
})
