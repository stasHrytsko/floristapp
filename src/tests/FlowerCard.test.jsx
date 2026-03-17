import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FlowerCard from '../components/FlowerCard'

const base = {
  flower_id: '1',
  name: 'Роза',
  total: 50,
  reserved: 10,
  available: 40,
  stale: false,
  low_stock_threshold: 5,
}

describe('FlowerCard', () => {
  it('отображает название и остатки', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('40')).toBeDefined()
    expect(screen.getByText('10')).toBeDefined()
    expect(screen.getByText('50')).toBeDefined()
  })

  it('не показывает предупреждение при норме', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.queryByText(/⚠️/)).toBeNull()
  })

  it('показывает предупреждение "скоро завянет" при stale=true', () => {
    render(<FlowerCard flower={{ ...base, stale: true }} />)
    expect(screen.getByText(/скоро завянет/)).toBeDefined()
  })

  it('показывает предупреждение "дефицит" при available < 0', () => {
    render(<FlowerCard flower={{ ...base, available: -2 }} />)
    expect(screen.getByText(/дефицит/)).toBeDefined()
  })

  it('показывает предупреждение о низком остатке когда available <= threshold', () => {
    render(<FlowerCard flower={{ ...base, available: 3, low_stock_threshold: 5 }} />)
    expect(screen.getByText(/осталось 3 шт, порог 5/)).toBeDefined()
  })

  it('не показывает низкий остаток когда available > threshold', () => {
    render(<FlowerCard flower={{ ...base, available: 10, low_stock_threshold: 5 }} />)
    expect(screen.queryByText(/осталось/)).toBeNull()
  })

  it('показывает текущий порог', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.getByText('порог: 5')).toBeDefined()
  })

  it('открывает редактирование порога по кнопке', () => {
    render(<FlowerCard flower={base} />)
    fireEvent.click(screen.getByText('порог: 5'))
    expect(screen.getByText('Сохранить')).toBeDefined()
    expect(screen.getByText('Отмена')).toBeDefined()
  })

  it('вызывает onThresholdChange при сохранении', () => {
    const onThresholdChange = vi.fn()
    render(<FlowerCard flower={base} onThresholdChange={onThresholdChange} />)
    fireEvent.click(screen.getByText('порог: 5'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '10' } })
    fireEvent.click(screen.getByText('Сохранить'))
    expect(onThresholdChange).toHaveBeenCalledWith('1', 10)
  })
})
