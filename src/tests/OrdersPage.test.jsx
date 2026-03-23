import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OrdersPage from '../pages/OrdersPage'
import OrderCard from '../components/OrderCard'

vi.mock('../hooks/useOrders', () => ({
  useOrders: vi.fn(),
}))
vi.mock('../hooks/useClients', () => ({
  useClients: vi.fn(),
}))
vi.mock('../hooks/useClientOrders', () => ({
  useClientOrders: vi.fn(() => ({ orders: [], loading: false })),
}))

import { useOrders } from '../hooks/useOrders'
import { useClients } from '../hooks/useClients'
import { useClientOrders } from '../hooks/useClientOrders'

const mockOrders = [
  {
    id: '1',
    client_name: 'Анна',
    client_phone: '+7 999 111 22 33',
    delivery_type: 'самовывоз',
    status: 'активный',
    ready_at: '2026-03-20',
    delivery_address: null,
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
    status: 'активный',
    ready_at: '2026-03-21',
    delivery_address: 'ул. Ленина, 5',
    order_items: [],
  },
]

const mockClients = [
  { id: 'c1', name: 'Анна', phone: '+7 999 111 22 33' },
  { id: 'c2', name: 'Мария', phone: '' },
]

function defaultClientsMock(overrides = {}) {
  return {
    clients: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    updateClient: vi.fn(),
    ...overrides,
  }
}

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useClients.mockReturnValue(defaultClientsMock())
  })

  function defaultOrdersMock(overrides = {}) {
    return { orders: [], loading: false, error: null, refresh: vi.fn(), changeStatus: vi.fn(), deleteOrder: vi.fn(), ...overrides }
  }

  it('показывает загрузку', () => {
    useOrders.mockReturnValue(defaultOrdersMock({ loading: true }))
    render(<OrdersPage />)
    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('показывает ошибку с кнопкой повторить', () => {
    useOrders.mockReturnValue(defaultOrdersMock({ error: 'Нет сети' }))
    render(<OrdersPage />)
    expect(screen.getByText(/не удалось загрузить заказы/i)).toBeDefined()
    expect(screen.getByText(/повторить/i)).toBeDefined()
  })

  it('показывает сообщение при пустом списке', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    render(<OrdersPage />)
    expect(screen.getByText(/активных заказов нет/i)).toBeDefined()
  })

  it('рендерит карточки заказов', () => {
    useOrders.mockReturnValue(defaultOrdersMock({ orders: mockOrders }))
    render(<OrdersPage />)
    expect(screen.getByText('Анна')).toBeDefined()
    expect(screen.getByText('Мария')).toBeDefined()
  })

  it('показывает переключатель Заказы / Клиенты', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    render(<OrdersPage />)
    expect(screen.getByText('Заказы')).toBeDefined()
    expect(screen.getByText('Клиенты')).toBeDefined()
  })

  it('переключается в режим клиентов и показывает список', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    expect(screen.getByText('Анна')).toBeDefined()
    expect(screen.getByText('Мария')).toBeDefined()
  })

  it('в разделе клиентов есть кнопки Изменить и История', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    expect(screen.getAllByText('Изменить').length).toBe(2)
    expect(screen.getAllByText('История').length).toBe(2)
  })

  it('открывает форму редактирования клиента', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    fireEvent.click(screen.getAllByText('Изменить')[0])
    expect(screen.getByDisplayValue('Анна')).toBeDefined()
  })

  it('открывает историю клиента', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    useClientOrders.mockReturnValue({
      orders: [
        {
          id: 'o1',
          ready_at: '2026-03-20',
          status: 'выдан',
          delivery_type: 'самовывоз',
          order_items: [{ quantity: 5, flowers: { name: 'Роза' } }],
        },
      ],
      loading: false,
    })
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    fireEvent.click(screen.getAllByText('История')[0])
    expect(screen.getByText(/История: Анна/)).toBeDefined()
    expect(screen.getByText('Роза × 5 шт')).toBeDefined()
  })

  it('закрывает историю при нажатии ✕', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    fireEvent.click(screen.getAllByText('История')[0])
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByText(/История:/)).toBeNull()
  })
})

describe('OrderCard', () => {
  it('показывает имя клиента и статус активный', () => {
    render(<OrderCard order={mockOrders[0]} />)
    expect(screen.getByText('Анна')).toBeDefined()
    expect(screen.getByText('активный')).toBeDefined()
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

  it('показывает кнопку → выполнен для активного заказа с onStatusChange', () => {
    render(<OrderCard order={mockOrders[0]} onStatusChange={vi.fn()} />)
    expect(screen.getByText(/→ выполнен/)).toBeDefined()
  })

  it('не показывает кнопку → выполнен без onStatusChange', () => {
    render(<OrderCard order={mockOrders[0]} />)
    expect(screen.queryByText(/→/)).toBeNull()
  })

  it('вызывает onStatusChange с id заказа при клике', () => {
    const onStatusChange = vi.fn()
    render(<OrderCard order={mockOrders[0]} onStatusChange={onStatusChange} />)
    fireEvent.click(screen.getByText(/→ выполнен/))
    expect(onStatusChange).toHaveBeenCalledWith('1')
  })

  it('показывает кнопку «Пересоздать заказ» когда передан onRecreate', () => {
    render(<OrderCard order={mockOrders[0]} onRecreate={vi.fn()} />)
    expect(screen.getByText(/пересоздать заказ/i)).toBeDefined()
  })

  it('не показывает кнопку «Пересоздать заказ» без onRecreate', () => {
    render(<OrderCard order={mockOrders[0]} />)
    expect(screen.queryByText(/пересоздать заказ/i)).toBeNull()
  })

  it('показывает диалог подтверждения при клике «Пересоздать заказ»', () => {
    render(<OrderCard order={mockOrders[0]} onRecreate={vi.fn()} />)
    fireEvent.click(screen.getByText(/пересоздать заказ/i))
    expect(screen.getByText(/удалить заказ/i)).toBeDefined()
  })

  it('вызывает onRecreate после подтверждения', () => {
    const onRecreate = vi.fn()
    render(<OrderCard order={mockOrders[0]} onRecreate={onRecreate} />)
    fireEvent.click(screen.getByText(/пересоздать заказ/i))
    fireEvent.click(screen.getByRole('button', { name: /^да$/i }))
    expect(onRecreate).toHaveBeenCalled()
  })

  it('не вызывает onRecreate при отмене', () => {
    const onRecreate = vi.fn()
    render(<OrderCard order={mockOrders[0]} onRecreate={onRecreate} />)
    fireEvent.click(screen.getByText(/пересоздать заказ/i))
    fireEvent.click(screen.getByRole('button', { name: /отмена/i }))
    expect(onRecreate).not.toHaveBeenCalled()
  })
})
