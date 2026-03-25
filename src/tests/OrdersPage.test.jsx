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
    delivery_address: null,
    status: 'резерв',
    ready_at: '2026-03-20',
    comment: null,
    order_items: [
      { id: 'oi1', quantity: 5, flower_id: 'f1', flowers: { name: 'Роза' } },
      { id: 'oi2', quantity: 3, flower_id: 'f2', flowers: { name: 'Тюльпан' } },
    ],
  },
  {
    id: '2',
    client_name: 'Мария',
    client_phone: null,
    delivery_type: 'доставка',
    delivery_address: 'ул. Ленина, 5',
    status: 'резерв',
    ready_at: '2026-03-21',
    comment: null,
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
    return {
      orders: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      closeOrder: vi.fn(),
      deleteOrder: vi.fn(),
      ...overrides,
    }
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

  it('активный таб отличается от неактивного стилем', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    render(<OrdersPage />)
    const orderTab = screen.getByRole('button', { name: 'Заказы' })
    const clientTab = screen.getByRole('button', { name: 'Клиенты' })
    expect(orderTab.className).toContain('bg-white')
    expect(clientTab.className).not.toContain('bg-white')
  })

  it('переключается в режим клиентов и показывает список', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    expect(screen.getByText('Анна')).toBeDefined()
    expect(screen.getByText('Мария')).toBeDefined()
  })

  it('в разделе клиентов есть кнопки изменить и история', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    expect(screen.getAllByRole('button', { name: 'изменить' }).length).toBe(2)
    expect(screen.getAllByRole('button', { name: 'история' }).length).toBe(2)
  })

  it('открывает форму редактирования клиента', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    fireEvent.click(screen.getAllByRole('button', { name: 'изменить' })[0])
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
          status: 'продано',
          delivery_type: 'самовывоз',
          order_items: [{ quantity: 5, flowers: { name: 'Роза' } }],
        },
      ],
      loading: false,
    })
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    fireEvent.click(screen.getAllByRole('button', { name: 'история' })[0])
    expect(screen.getByText(/История: Анна/)).toBeDefined()
    expect(screen.getByText('Роза × 5 шт')).toBeDefined()
  })

  it('закрывает историю при нажатии ✕', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    useClients.mockReturnValue(defaultClientsMock({ clients: mockClients }))
    render(<OrdersPage />)
    fireEvent.click(screen.getByText('Клиенты'))
    fireEvent.click(screen.getAllByRole('button', { name: 'история' })[0])
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByText(/История:/)).toBeNull()
  })

  it('кнопка Создать заказ вызывает onCreateNew', () => {
    useOrders.mockReturnValue(defaultOrdersMock())
    const onCreateNew = vi.fn()
    render(<OrdersPage onCreateNew={onCreateNew} />)
    fireEvent.click(screen.getByText('Создать заказ'))
    expect(onCreateNew).toHaveBeenCalled()
  })
})

describe('OrderCard', () => {
  it('показывает имя клиента и бейдж резерв', () => {
    render(<OrderCard order={mockOrders[0]} />)
    expect(screen.getByText('Анна')).toBeDefined()
    expect(screen.getByText('резерв')).toBeDefined()
  })

  it('заказ в статусе резерв показывает 4 иконки: детали, изменить, удалить, закрыть', () => {
    render(<OrderCard order={mockOrders[0]} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'детали' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'изменить' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'удалить' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'закрыть' })).toBeDefined()
  })

  it('заказ в статусе продано показывает только иконку детали', () => {
    const soldOrder = { ...mockOrders[0], status: 'продано' }
    render(<OrderCard order={soldOrder} />)
    expect(screen.getByRole('button', { name: 'детали' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'изменить' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'удалить' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'закрыть' })).toBeNull()
  })

  it('клик закрыть вызывает onClose с id заказа', () => {
    const onClose = vi.fn()
    render(<OrderCard order={mockOrders[0]} onClose={onClose} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'закрыть' }))
    expect(onClose).toHaveBeenCalledWith('1')
  })

  it('клик удалить показывает диалог подтверждения', () => {
    render(<OrderCard order={mockOrders[0]} onDelete={vi.fn()} onEdit={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'удалить' }))
    expect(screen.getByText(/удалить заказ/i)).toBeDefined()
  })

  it('клик изменить показывает диалог подтверждения', () => {
    render(<OrderCard order={mockOrders[0]} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'изменить' }))
    expect(screen.getByText(/изменить заказ/i)).toBeDefined()
  })

  it('попап деталей показывает клиент, телефон, тип и состав', () => {
    render(<OrderCard order={mockOrders[0]} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'детали' }))
    expect(screen.getByText('+7 999 111 22 33')).toBeDefined()
    expect(screen.getByText(/самовывоз/i)).toBeDefined()
    expect(screen.getByText(/Роза × 5 шт/)).toBeDefined()
    expect(screen.getByText(/Тюльпан × 3 шт/)).toBeDefined()
  })

  it('попап деталей закрывается по кнопке ✕', () => {
    render(<OrderCard order={mockOrders[0]} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'детали' }))
    expect(screen.getByText('+7 999 111 22 33')).toBeDefined()
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByText('+7 999 111 22 33')).toBeNull()
  })
})
