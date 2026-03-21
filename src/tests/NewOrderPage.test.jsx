import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewOrderPage from '../pages/NewOrderPage'

vi.mock('../hooks/useFlowerStock', () => ({ useFlowerStock: vi.fn() }))
vi.mock('../hooks/useNewOrder', () => ({ useNewOrder: vi.fn() }))

import { useFlowerStock } from '../hooks/useFlowerStock'
import { useNewOrder } from '../hooks/useNewOrder'

const mockFlowers = [
  { flower_id: '1', name: 'Роза', total: 10, reserved: 2, available: 8, stale: false },
  { flower_id: '2', name: 'Тюльпан', total: 5, reserved: 5, available: 0, stale: false },
]

function setup(saveOrderOverride) {
  const saveOrder = saveOrderOverride ?? vi.fn().mockResolvedValue(undefined)
  useFlowerStock.mockReturnValue({ flowers: mockFlowers, loading: false, error: null, refresh: vi.fn() })
  useNewOrder.mockReturnValue({ saveOrder })
  return { saveOrder }
}

function fillBaseForm() {
  fireEvent.change(screen.getByPlaceholderText(/введите имя/i), { target: { value: 'Анна' } })
  const dateInput = document.querySelector('input[type="date"]')
  fireEvent.change(dateInput, { target: { value: '2026-03-20' } })
}

describe('NewOrderPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает загрузку пока данные не загружены', () => {
    useFlowerStock.mockReturnValue({ flowers: [], loading: true, error: null, refresh: vi.fn() })
    useNewOrder.mockReturnValue({ saveOrder: vi.fn() })
    render(<NewOrderPage />)
    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('рендерит поля формы', () => {
    setup()
    render(<NewOrderPage />)
    expect(screen.getByPlaceholderText(/введите имя/i)).toBeDefined()
    expect(screen.getByPlaceholderText(/\+7/i)).toBeDefined()
    expect(document.querySelector('input[type="date"]')).toBeDefined()
    expect(screen.getByText(/тип получения/i)).toBeDefined()
  })

  it('не показывает поле адреса при самовывозе', () => {
    setup()
    render(<NewOrderPage />)
    expect(screen.queryByPlaceholderText(/введите адрес/i)).toBeNull()
  })

  it('показывает поле адреса при выборе доставки', () => {
    setup()
    render(<NewOrderPage />)
    const selects = screen.getAllByRole('combobox')
    const deliverySelect = selects.find((s) => s.value === 'самовывоз')
    fireEvent.change(deliverySelect, { target: { value: 'доставка' } })
    expect(screen.getByPlaceholderText(/введите адрес/i)).toBeDefined()
  })

  it('скрывает поле адреса при переключении обратно на самовывоз', () => {
    setup()
    render(<NewOrderPage />)
    const selects = screen.getAllByRole('combobox')
    const deliverySelect = selects.find((s) => s.value === 'самовывоз')
    fireEvent.change(deliverySelect, { target: { value: 'доставка' } })
    fireEvent.change(deliverySelect, { target: { value: 'самовывоз' } })
    expect(screen.queryByPlaceholderText(/введите адрес/i)).toBeNull()
  })

  it('показывает только цветы с доступными остатками', () => {
    setup()
    render(<NewOrderPage />)
    expect(screen.getByText(/роза/i)).toBeDefined()
    expect(screen.queryByText(/тюльпан/i)).toBeNull()
  })

  it('добавляет новую позицию по кнопке', () => {
    setup()
    render(<NewOrderPage />)
    expect(screen.getAllByText(/позиция/i)).toHaveLength(1)
    fireEvent.click(screen.getByText(/добавить цветок/i))
    expect(screen.getAllByText(/позиция/i)).toHaveLength(2)
  })

  it('удаляет позицию по кнопке', () => {
    setup()
    render(<NewOrderPage />)
    fireEvent.click(screen.getByText(/добавить цветок/i))
    expect(screen.getAllByText(/позиция/i)).toHaveLength(2)
    fireEvent.click(screen.getAllByText('Удалить')[0])
    expect(screen.getAllByText(/позиция/i)).toHaveLength(1)
  })

  it('показывает ошибку когда количество превышает остаток', () => {
    setup()
    render(<NewOrderPage />)
    const flowerSelects = screen.getAllByRole('combobox')
    const flowerSelect = flowerSelects[flowerSelects.length - 1]
    fireEvent.change(flowerSelect, { target: { value: '1' } }) // Роза, available: 8
    fireEvent.change(screen.getByPlaceholderText(/количество/i), { target: { value: '9' } })
    expect(screen.getByText(/на складе только 8/i)).toBeDefined()
  })

  it('содержит название цветка в сообщении об ошибке', () => {
    setup()
    render(<NewOrderPage />)
    const flowerSelects = screen.getAllByRole('combobox')
    const flowerSelect = flowerSelects[flowerSelects.length - 1]
    fireEvent.change(flowerSelect, { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText(/количество/i), { target: { value: '100' } })
    expect(screen.getByText(/на складе только.*роза/i)).toBeDefined()
  })

  it('кнопка «Сохранить» заблокирована когда количество превышает остаток', () => {
    setup()
    render(<NewOrderPage />)
    fillBaseForm()
    const flowerSelects = screen.getAllByRole('combobox')
    const flowerSelect = flowerSelects[flowerSelects.length - 1]
    fireEvent.change(flowerSelect, { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText(/количество/i), { target: { value: '100' } })
    const btn = screen.getByRole('button', { name: /сохранить заказ/i })
    expect(btn.disabled).toBe(true)
  })

  it('кнопка «Сохранить» заблокирована при пустой форме', () => {
    setup()
    render(<NewOrderPage />)
    const btn = screen.getByRole('button', { name: /сохранить заказ/i })
    expect(btn.disabled).toBe(true)
  })

  it('вызывает saveOrder с корректными данными', async () => {
    const { saveOrder } = setup()
    render(<NewOrderPage />)
    fillBaseForm()
    const flowerSelects = screen.getAllByRole('combobox')
    const flowerSelect = flowerSelects[flowerSelects.length - 1]
    fireEvent.change(flowerSelect, { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText(/количество/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить заказ/i }))
    await waitFor(() =>
      expect(saveOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          clientName: 'Анна',
          deliveryType: 'самовывоз',
          items: expect.arrayContaining([
            expect.objectContaining({ flowerId: '1', quantity: 3 }),
          ]),
        })
      )
    )
  })

  it('показывает сообщение об успехе после сохранения', async () => {
    const { saveOrder } = setup()
    render(<NewOrderPage />)
    fillBaseForm()
    const flowerSelects = screen.getAllByRole('combobox')
    const flowerSelect = flowerSelects[flowerSelects.length - 1]
    fireEvent.change(flowerSelect, { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText(/количество/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить заказ/i }))
    await waitFor(() => expect(screen.getByText(/заказ сохранён/i)).toBeDefined())
  })

  it('показывает ошибку при неудачном сохранении', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Нет сети')))
    render(<NewOrderPage />)
    fillBaseForm()
    const flowerSelects = screen.getAllByRole('combobox')
    const flowerSelect = flowerSelects[flowerSelects.length - 1]
    fireEvent.change(flowerSelect, { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText(/количество/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить заказ/i }))
    await waitFor(() => expect(screen.getByText('Нет сети')).toBeDefined())
  })
})
