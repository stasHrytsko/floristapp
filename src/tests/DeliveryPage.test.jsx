import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DeliveryPage from '../pages/DeliveryPage'

vi.mock('../hooks/useSuppliers', () => ({ useSuppliers: vi.fn() }))
vi.mock('../hooks/useFlowerStock', () => ({ useFlowerStock: vi.fn() }))
vi.mock('../hooks/useDelivery', () => ({ useDelivery: vi.fn() }))
vi.mock('../hooks/useAddFlower', () => ({ useAddFlower: vi.fn() }))

import { useSuppliers } from '../hooks/useSuppliers'
import { useFlowerStock } from '../hooks/useFlowerStock'
import { useDelivery } from '../hooks/useDelivery'
import { useAddFlower } from '../hooks/useAddFlower'

const mockSuppliers = [{ id: '1', name: 'Розы опт', phone: '' }]
const mockFlowers = [
  { flower_id: '10', name: 'Роза', total: 5, reserved: 0, free: 5, stale: false },
]

function setup(saveDeliveryOverride) {
  const saveDelivery = saveDeliveryOverride ?? vi.fn().mockResolvedValue(undefined)
  useSuppliers.mockReturnValue({ suppliers: mockSuppliers, loading: false, error: null })
  useFlowerStock.mockReturnValue({ flowers: mockFlowers, loading: false, error: null, refresh: vi.fn() })
  useDelivery.mockReturnValue({ saveDelivery })
  useAddFlower.mockReturnValue({ addFlower: vi.fn().mockResolvedValue({ id: '99', name: 'Новый' }) })
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
    render(<DeliveryPage />)
    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('рендерит форму с поставщиком и датой', () => {
    setup()
    render(<DeliveryPage />)
    expect(screen.getAllByText(/поставщик/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/дата поставки/i)).toBeDefined()
  })

  it('отображает список поставщиков в select', () => {
    setup()
    render(<DeliveryPage />)
    expect(screen.getByText('Розы опт')).toBeDefined()
  })

  it('отображает список цветков в select', () => {
    setup()
    render(<DeliveryPage />)
    expect(screen.getByText('Роза')).toBeDefined()
  })

  it('добавляет новую позицию по кнопке', () => {
    setup()
    render(<DeliveryPage />)
    expect(screen.getAllByText(/позиция/i)).toHaveLength(1)
    fireEvent.click(screen.getByText(/добавить позицию/i))
    expect(screen.getAllByText(/позиция/i)).toHaveLength(2)
  })

  it('удаляет позицию по кнопке «Удалить»', () => {
    setup()
    render(<DeliveryPage />)
    fireEvent.click(screen.getByText(/добавить позицию/i))
    expect(screen.getAllByText(/позиция/i)).toHaveLength(2)
    fireEvent.click(screen.getAllByText('Удалить')[0])
    expect(screen.getAllByText(/позиция/i)).toHaveLength(1)
  })

  it('показывает поле кол-ва брака при выборе типа брака', () => {
    setup()
    render(<DeliveryPage />)
    const selects = screen.getAllByRole('combobox')
    // 3-й select — тип брака (0=поставщик, 1=цветок, 2=брак)
    fireEvent.change(selects[2], { target: { value: 'гнилой' } })
    expect(screen.getByPlaceholderText(/кол-во брака/i)).toBeDefined()
  })

  it('скрывает поле кол-ва брака при сбросе типа брака', () => {
    setup()
    render(<DeliveryPage />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[2], { target: { value: 'гнилой' } })
    fireEvent.change(selects[2], { target: { value: '' } })
    expect(screen.queryByPlaceholderText(/кол-во брака/i)).toBeNull()
  })

  it('кнопка «Сохранить» заблокирована при пустой форме', () => {
    setup()
    render(<DeliveryPage />)
    const btn = screen.getByRole('button', { name: /сохранить поставку/i })
    expect(btn.disabled).toBe(true)
  })

  it('вызывает saveDelivery с корректными данными', async () => {
    const { saveDelivery } = setup()
    render(<DeliveryPage />)
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

  it('показывает сообщение об успехе после сохранения', async () => {
    setup()
    render(<DeliveryPage />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /сохранить поставку/i }))
    await waitFor(() => expect(screen.getByText(/поставка сохранена/i)).toBeDefined())
  })

  it('показывает ошибку при неудачном сохранении', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Нет сети')))
    render(<DeliveryPage />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /сохранить поставку/i }))
    await waitFor(() => expect(screen.getByText('Нет сети')).toBeDefined())
  })
})
