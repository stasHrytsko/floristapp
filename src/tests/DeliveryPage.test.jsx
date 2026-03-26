import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DeliveryPage from '../pages/DeliveryPage'

vi.mock('../hooks/useSuppliers', () => ({ useSuppliers: vi.fn() }))
vi.mock('../hooks/useFlowerStock', () => ({ useFlowerStock: vi.fn() }))
vi.mock('../hooks/useDelivery', () => ({ useDelivery: vi.fn() }))
vi.mock('../hooks/useAddFlower', () => ({ useAddFlower: vi.fn() }))
vi.mock('../hooks/useDeliveries', () => ({ useDeliveries: vi.fn() }))
vi.mock('../pages/SuppliersPage', () => ({
  default: ({ addFormOpen }) => <div>Список поставщиков{addFormOpen ? '-форма' : ''}</div>,
}))

import { useSuppliers } from '../hooks/useSuppliers'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useDelivery } from '../hooks/useDelivery'
import { useAddFlower } from '../hooks/useAddFlower'
import { useDeliveries } from '../hooks/useDeliveries'

const mockSuppliers = [{ id: '1', name: 'Розы опт', phone: '' }]
const mockFlowers = [
  { flower_id: '10', name: 'Роза', total: 5, reserved: 0, free: 5, stale: false },
]
const mockDeliveries = [
  {
    id: 'd1',
    delivered_at: '2026-03-17',
    supplier_id: '1',
    suppliers: { name: 'Розы опт' },
    delivery_items: [{ id: 'di1', quantity: 50, batch_id: null, flowers: { id: '10', name: 'Роза' } }],
  },
]

function setup(saveDeliveryOverride) {
  const saveDelivery = saveDeliveryOverride ?? vi.fn().mockResolvedValue(undefined)
  useSuppliers.mockReturnValue({ suppliers: mockSuppliers, loading: false, error: null })
  useFlowerStock.mockReturnValue({ flowers: mockFlowers, loading: false, error: null, refresh: vi.fn() })
  useDelivery.mockReturnValue({ saveDelivery })
  useAddFlower.mockReturnValue({ addFlower: vi.fn().mockResolvedValue({ id: '99', name: 'Новый' }) })
  useDeliveries.mockReturnValue({
    deliveries: mockDeliveries,
    loading: false,
    error: null,
    refresh: vi.fn(),
    deleteDelivery: vi.fn(),
    updateDelivery: vi.fn(),
  })
  return { saveDelivery }
}

function fillForm() {
  const selects = screen.getAllByRole('combobox')
  fireEvent.change(selects[0], { target: { value: '1' } })   // поставщик
  fireEvent.change(selects[1], { target: { value: '10' } })  // цветок
  fireEvent.change(screen.getByPlaceholderText(/количество/i), { target: { value: '50' } })
}

describe('DeliveryPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает загрузку пока данные не загружены', () => {
    useSuppliers.mockReturnValue({ suppliers: [], loading: true, error: null })
    useFlowerStock.mockReturnValue({ flowers: [], loading: false, error: null, refresh: vi.fn() })
    useDelivery.mockReturnValue({ saveDelivery: vi.fn() })
    useAddFlower.mockReturnValue({ addFlower: vi.fn() })
    useDeliveries.mockReturnValue({ deliveries: [], loading: false, error: null, refresh: vi.fn(), deleteDelivery: vi.fn(), updateDelivery: vi.fn() })
    render(<DeliveryPage />)
    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('показывает переключатель Поставки/Поставщики', () => {
    setup()
    render(<DeliveryPage />)
    expect(screen.getByText('Поставки')).toBeDefined()
    expect(screen.getByText('Поставщики')).toBeDefined()
  })

  it('показывает SuppliersPage при переходе на вкладку Поставщики', () => {
    setup()
    render(<DeliveryPage />)
    fireEvent.click(screen.getByText('Поставщики'))
    expect(screen.getByText('Список поставщиков')).toBeDefined()
  })

  it('показывает карточку поставки в списке', () => {
    setup()
    render(<DeliveryPage />)
    expect(screen.getByText('Розы опт')).toBeDefined()
  })

  it('показывает форму после нажатия Новая поставка', () => {
    setup()
    render(<DeliveryPage />)
    fireEvent.click(screen.getByText('Новая поставка'))
    expect(screen.getAllByText(/поставщик/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/дата поставки/i)).toBeDefined()
  })

  it('добавляет позицию в форме', () => {
    setup()
    render(<DeliveryPage />)
    fireEvent.click(screen.getByText('Новая поставка'))
    expect(screen.getAllByText(/позиция/i)).toHaveLength(1)
    fireEvent.click(screen.getByText(/добавить позицию/i))
    expect(screen.getAllByText(/позиция/i)).toHaveLength(2)
  })

  it('кнопка "Сохранить" заблокирована при пустой форме', () => {
    setup()
    render(<DeliveryPage />)
    fireEvent.click(screen.getByText('Новая поставка'))
    const btn = screen.getByRole('button', { name: /сохранить поставку/i })
    expect(btn.disabled).toBe(true)
  })

  it('вызывает saveDelivery с корректными данными', async () => {
    const { saveDelivery } = setup()
    render(<DeliveryPage />)
    fireEvent.click(screen.getByText('Новая поставка'))
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /сохранить поставку/i }))
    await waitFor(() =>
      expect(saveDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: '1',
          items: expect.arrayContaining([
            expect.objectContaining({ flowerId: '10', quantity: 50 }),
          ]),
        })
      )
    )
  })

  it('скрывает форму и обновляет список после сохранения', async () => {
    setup()
    render(<DeliveryPage />)
    fireEvent.click(screen.getByText('Новая поставка'))
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /сохранить поставку/i }))
    await waitFor(() => expect(screen.queryByText(/дата поставки/i)).toBeNull())
    expect(screen.getByText(/поставка оформлена/i)).toBeDefined()
  })

  it('показывает ошибку при неудачном сохранении', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Нет сети')))
    render(<DeliveryPage />)
    fireEvent.click(screen.getByText('Новая поставка'))
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /сохранить поставку/i }))
    await waitFor(() => expect(screen.getByText('Нет сети')).toBeDefined())
  })
})
