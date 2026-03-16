import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrdersPage from '../pages/OrdersPage'
import OrderCard from '../components/OrderCard'

vi.mock('../hooks/useOrders', () => ({
  useOrders: vi.fn(),
}))

import { useOrders } from '../hooks/useOrders'

const mockOrders = [
  {
    id: '1',
    client_name: 'Анна',
    client_phone: '+7 999 111 22 33',
    delivery_type: 'самовывоз',
    status: 'новый',
    ready_at: '2026-03-20',
    address: null,
    order_items: [
      { quantity: 5, flowers: { name: 'Роза' } },
      { quantity: 3, flowers: { name: 'Тюльпан' } },
    ],
  },
  {
    id: '2',
    client_name: 'Мария',
    client_phone: null,
    delivery_type: 'доставка',
    status: 'в работе',
    ready_at: '2026-03-21',
    address: 'ул. Ленина, 5',
    order_items: [],
  },
]

describe('OrdersPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает загрузку', () => {
    useOrders.mockReturnValue({ orders: [], loading: true, error: null, refresh: vi.fn() })
    render(<OrdersPage />)
    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('показывает ошибку с кнопкой повторить', () => {
    useOrders.mockReturnValue({ orders: [], loading: false, error: 'Нет сети', refresh: vi.fn() })
    render(<OrdersPage />)
    expect(screen.getByText('Нет сети')).toBeDefined()
    expect(screen.getByText(/повторить/i)).toBeDefined()
  })

  it('показывает сообщение при пустом списке', () => {
    useOrders.mockReturnValue({ orders: [], loading: false, error: null, refresh: vi.fn() })
    render(<OrdersPage />)
    expect(screen.getByText(/активных заказов нет/i)).toBeDefined()
  })

  it('рендерит карточки заказов', () => {
    useOrders.mockReturnValue({ orders: mockOrders, loading: false, error: null, refresh: vi.fn() })
    render(<OrdersPage />)
    expect(screen.getByText('Анна')).toBeDefined()
    expect(screen.getByText('Мария')).toBeDefined()
  })
})

describe('OrderCard', () => {
  it('показывает имя клиента и статус', () => {
    render(<OrderCard order={mockOrders[0]} />)
    expect(screen.getByText('Анна')).toBeDefined()
    expect(screen.getByText('новый')).toBeDefined()
  })

  it('показывает состав заказа', () => {
    render(<OrderCard order={mockOrders[0]} />)
    expect(screen.getByText(/Роза × 5/)).toBeDefined()
    expect(screen.getByText(/Тюльпан × 3/)).toBeDefined()
  })

  it('показывает тип получения — самовывоз', () => {
    render(<OrderCard order={mockOrders[0]} />)
    expect(screen.getByText(/самовывоз/i)).toBeDefined()
  })

  it('показывает тип получения — доставка с адресом', () => {
    render(<OrderCard order={mockOrders[1]} />)
    expect(screen.getByText(/доставка/i)).toBeDefined()
    expect(screen.getByText('ул. Ленина, 5')).toBeDefined()
  })

  it('не показывает телефон если его нет', () => {
    render(<OrderCard order={mockOrders[1]} />)
    expect(screen.queryByText(/\+7/)).toBeNull()
  })
})
