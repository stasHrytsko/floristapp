import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DeliveryCard from '../components/DeliveryCard'

vi.mock('../hooks/useDeliveryStatus', () => ({
  useDeliveryStatus: vi.fn(),
  DELIVERY_STATUSES: ['оформлено', 'оплачено', 'доставка', 'на складе'],
}))

import { useDeliveryStatus } from '../hooks/useDeliveryStatus'

const mockDelivery = (status = 'оформлено', has_issues = false) => ({
  id: '1',
  delivered_at: '2026-03-17',
  status,
  has_issues,
  supplier_id: 'sup1',
  suppliers: { name: 'Розы опт' },
  delivery_items: [
    { id: 'di1', quantity: 50, flowers: { id: 'f1', name: 'Роза' } },
    { id: 'di2', quantity: 20, flowers: { id: 'f2', name: 'Тюльпан' } },
  ],
})

function setup(advanceFn) {
  const advanceStatus = advanceFn ?? vi.fn().mockResolvedValue(undefined)
  const nextStatus = (s) => {
    const arr = ['оформлено', 'оплачено', 'доставка', 'на складе']
    const idx = arr.indexOf(s)
    return idx >= 0 && idx < arr.length - 1 ? arr[idx + 1] : null
  }
  useDeliveryStatus.mockReturnValue({ advanceStatus, nextStatus })
  return { advanceStatus }
}

describe('DeliveryCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает поставщика и дату', () => {
    setup()
    render(<DeliveryCard delivery={mockDelivery()} onAccept={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText('Розы опт')).toBeDefined()
    expect(screen.getByText(/17/)).toBeDefined()
  })

  it('показывает состав позиций', () => {
    setup()
    render(<DeliveryCard delivery={mockDelivery()} onAccept={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText(/Роза × 50/)).toBeDefined()
    expect(screen.getByText(/Тюльпан × 20/)).toBeDefined()
  })

  it('показывает текущий статус', () => {
    setup()
    render(<DeliveryCard delivery={mockDelivery('оплачено')} onAccept={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText('оплачено')).toBeDefined()
  })

  it('показывает ⚠️ если есть проблемы', () => {
    setup()
    render(<DeliveryCard delivery={mockDelivery('на складе', true)} onAccept={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText(/⚠️/)).toBeDefined()
  })

  it('показывает кнопку следующего статуса', () => {
    setup()
    render(<DeliveryCard delivery={mockDelivery('оплачено')} onAccept={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText(/→ доставка/)).toBeDefined()
  })

  it('не показывает кнопку на последнем статусе', () => {
    setup()
    render(<DeliveryCard delivery={mockDelivery('на складе')} onAccept={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /→/ })).toBeNull()
  })

  it('вызывает advanceStatus при обычном переходе', async () => {
    const { advanceStatus } = setup()
    const onRefresh = vi.fn()
    render(<DeliveryCard delivery={mockDelivery('оформлено')} onAccept={vi.fn()} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByText(/→ оплачено/))
    await waitFor(() => expect(advanceStatus).toHaveBeenCalledWith('1', 'оформлено'))
    await waitFor(() => expect(onRefresh).toHaveBeenCalled())
  })

  it('вызывает onAccept при переходе в "на складе"', () => {
    setup()
    const onAccept = vi.fn()
    render(<DeliveryCard delivery={mockDelivery('доставка')} onAccept={onAccept} onRefresh={vi.fn()} />)
    fireEvent.click(screen.getByText(/→ на складе/))
    expect(onAccept).toHaveBeenCalled()
  })
})
