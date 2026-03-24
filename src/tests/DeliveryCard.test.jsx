import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeliveryCard from '../components/DeliveryCard'

vi.mock('../hooks/useDefect', () => ({
  useDefect: vi.fn(),
}))
vi.mock('../components/ConfirmDialog', () => ({
  default: ({ message, onConfirm, onCancel }) => (
    <div>
      <p>{message}</p>
      <button onClick={onConfirm}>Да</button>
      <button onClick={onCancel}>Отмена</button>
    </div>
  ),
}))

import { useDefect } from '../hooks/useDefect'

const mockDelivery = (batchIds = [null, null]) => ({
  id: 'd1',
  delivered_at: '2026-03-19',
  supplier_id: 'sup1',
  suppliers: { name: 'Розы опт' },
  delivery_items: [
    { id: 'di1', quantity: 25, batch_id: batchIds[0], flowers: { id: 'f1', name: 'Роза' } },
    { id: 'di2', quantity: 10, batch_id: batchIds[1], flowers: { id: 'f2', name: 'Тюльпан' } },
  ],
})

describe('DeliveryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDefect.mockReturnValue({ markDefect: vi.fn().mockResolvedValue(undefined) })
  })

  it('показывает поставщика и дату', () => {
    render(<DeliveryCard delivery={mockDelivery()} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText('Розы опт')).toBeDefined()
    expect(screen.getByText('19.03.2026')).toBeDefined()
  })

  it('показывает позиции в формате • Цветок — qty шт', () => {
    render(<DeliveryCard delivery={mockDelivery()} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText(/Роза — 25 шт/)).toBeDefined()
    expect(screen.getByText(/Тюльпан — 10 шт/)).toBeDefined()
  })

  it('показывает кнопки Изменить и Удалить', () => {
    render(<DeliveryCard delivery={mockDelivery()} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText('Изменить')).toBeDefined()
    expect(screen.getByText('Удалить')).toBeDefined()
  })

  it('кнопка Удалить активна когда нет batch_id', () => {
    render(<DeliveryCard delivery={mockDelivery([null, null])} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    const btn = screen.getByText('Удалить').closest('button')
    expect(btn.disabled).toBe(false)
  })

  it('кнопка Удалить неактивна если есть batch_id', () => {
    render(<DeliveryCard delivery={mockDelivery(['b1', null])} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    const btn = screen.getByText('Удалить').closest('button')
    expect(btn.disabled).toBe(true)
  })

  it('вызывает onEdit при клике Изменить', () => {
    const onEdit = vi.fn()
    const delivery = mockDelivery()
    render(<DeliveryCard delivery={delivery} onEdit={onEdit} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    fireEvent.click(screen.getByText('Изменить'))
    expect(onEdit).toHaveBeenCalledWith(delivery)
  })

  it('показывает диалог подтверждения при клике Удалить', () => {
    render(<DeliveryCard delivery={mockDelivery()} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    fireEvent.click(screen.getByText('Удалить'))
    expect(screen.getByText('Удалить поставку?')).toBeDefined()
  })

  it('показывает кнопки Брак для каждой позиции', () => {
    render(<DeliveryCard delivery={mockDelivery()} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getAllByText('Брак').length).toBe(2)
  })

  it('открывает форму брака при клике Брак', () => {
    render(<DeliveryCard delivery={mockDelivery()} onEdit={vi.fn()} onDelete={vi.fn()} onRefresh={vi.fn()} />)
    fireEvent.click(screen.getAllByText('Брак')[0])
    expect(screen.getByText(/Брак: Роза/)).toBeDefined()
  })
})
