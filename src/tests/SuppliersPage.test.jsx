import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SuppliersPage from '../pages/SuppliersPage'

vi.mock('../hooks/useSuppliers', () => ({
  useSuppliers: vi.fn(),
}))
vi.mock('../hooks/useSupplierDeliveries', () => ({
  useSupplierDeliveries: vi.fn(() => ({ deliveries: [], loading: false })),
}))

import { useSuppliers } from '../hooks/useSuppliers'
import { useSupplierDeliveries } from '../hooks/useSupplierDeliveries'

const mockSuppliers = [
  { id: '1', name: 'Розы опт', phone: '+7 900 111 22 33' },
  { id: '2', name: 'ЦветТорг', phone: '+7 900 444 55 66' },
]

const fiveSuppliers = Array.from({ length: 5 }, (_, i) => ({
  id: String(i + 1),
  name: `Поставщик ${i + 1}`,
  phone: '',
}))

function defaultMock(overrides = {}) {
  return {
    suppliers: [],
    loading: false,
    error: null,
    addSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    deleteSupplier: vi.fn(),
    ...overrides,
  }
}

describe('SuppliersPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает загрузку', () => {
    useSuppliers.mockReturnValue(defaultMock({ loading: true }))
    render(<SuppliersPage />)
    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('показывает ошибку', () => {
    useSuppliers.mockReturnValue(defaultMock({ error: 'Нет сети' }))
    render(<SuppliersPage />)
    expect(screen.getByText(/не удалось загрузить поставщиков/i)).toBeDefined()
  })

  it('показывает сообщение при пустом списке', () => {
    useSuppliers.mockReturnValue(defaultMock())
    render(<SuppliersPage />)
    expect(screen.getByText(/не добавлены/i)).toBeDefined()
  })

  it('рендерит список поставщиков', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    render(<SuppliersPage />)
    expect(screen.getByText('Розы опт')).toBeDefined()
    expect(screen.getByText('ЦветТорг')).toBeDefined()
  })

  it('показывает счётчик "N из 5"', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    render(<SuppliersPage />)
    expect(screen.getByText('2 из 5')).toBeDefined()
  })

  it('кнопка «Добавить» активна когда < 5 поставщиков', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    render(<SuppliersPage />)
    const btn = screen.getByRole('button', { name: /добавить/i })
    expect(btn.disabled).toBe(false)
  })

  it('кнопка «Добавить» заблокирована при 5 поставщиках', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: fiveSuppliers }))
    render(<SuppliersPage />)
    const btn = screen.getByRole('button', { name: /максимум/i })
    expect(btn.disabled).toBe(true)
  })

  it('показывает форму при клике «Добавить»', () => {
    useSuppliers.mockReturnValue(defaultMock())
    render(<SuppliersPage />)
    fireEvent.click(screen.getByRole('button', { name: /добавить/i }))
    expect(screen.getByPlaceholderText(/имя поставщика/i)).toBeDefined()
  })

  it('вызывает addSupplier при отправке формы', async () => {
    const addSupplier = vi.fn().mockResolvedValue(undefined)
    useSuppliers.mockReturnValue(defaultMock({ addSupplier }))
    render(<SuppliersPage />)
    fireEvent.click(screen.getByRole('button', { name: /добавить/i }))
    fireEvent.change(screen.getByPlaceholderText(/имя поставщика/i), {
      target: { value: 'Новый поставщик' },
    })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))
    await waitFor(() => expect(addSupplier).toHaveBeenCalledWith('Новый поставщик', ''))
  })

  it('показывает форму редактирования при клике «Изменить»', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    render(<SuppliersPage />)
    const editBtns = screen.getAllByText('Изменить')
    fireEvent.click(editBtns[0])
    expect(screen.getByDisplayValue('Розы опт')).toBeDefined()
  })

  it('показывает диалог подтверждения при клике «Удалить»', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    render(<SuppliersPage />)
    const deleteBtns = screen.getAllByText('Удалить')
    fireEvent.click(deleteBtns[0])
    expect(screen.getByText(/удалить поставщика/i)).toBeDefined()
  })

  it('вызывает deleteSupplier после подтверждения', async () => {
    const deleteSupplier = vi.fn().mockResolvedValue(undefined)
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers, deleteSupplier }))
    render(<SuppliersPage />)
    const deleteBtns = screen.getAllByText('Удалить')
    fireEvent.click(deleteBtns[0])
    fireEvent.click(screen.getByRole('button', { name: /^да$/i }))
    await waitFor(() => expect(deleteSupplier).toHaveBeenCalledWith('1'))
  })

  it('не вызывает deleteSupplier при отмене', async () => {
    const deleteSupplier = vi.fn()
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers, deleteSupplier }))
    render(<SuppliersPage />)
    const deleteBtns = screen.getAllByText('Удалить')
    fireEvent.click(deleteBtns[0])
    fireEvent.click(screen.getByRole('button', { name: /отмена/i }))
    expect(deleteSupplier).not.toHaveBeenCalled()
  })

  it('показывает кнопку «Детали» у каждого поставщика', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    render(<SuppliersPage />)
    expect(screen.getAllByText('Детали').length).toBe(2)
  })

  it('открывает bottom sheet при клике «Детали»', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    render(<SuppliersPage />)
    fireEvent.click(screen.getAllByText('Детали')[0])
    expect(screen.getByText(/поставки: розы опт/i)).toBeDefined()
  })

  it('показывает поставки в bottom sheet', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    useSupplierDeliveries.mockReturnValue({
      deliveries: [
        {
          id: 'd1',
          delivered_at: '2026-03-20',
          status: 'на складе',
          delivery_items: [
            { quantity: 50, flowers: { name: 'Роза' } },
          ],
        },
      ],
      loading: false,
    })
    render(<SuppliersPage />)
    fireEvent.click(screen.getAllByText('Детали')[0])
    expect(screen.getByText('2026-03-20')).toBeDefined()
    expect(screen.getByText('Роза × 50 шт')).toBeDefined()
    expect(screen.getByText('на складе')).toBeDefined()
  })

  it('закрывает bottom sheet при нажатии на ✕', () => {
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers }))
    render(<SuppliersPage />)
    fireEvent.click(screen.getAllByText('Детали')[0])
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByText(/поставки:/i)).toBeNull()
  })
})
