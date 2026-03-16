import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SuppliersPage from '../pages/SuppliersPage'

vi.mock('../hooks/useSuppliers', () => ({
  useSuppliers: vi.fn(),
}))

import { useSuppliers } from '../hooks/useSuppliers'

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
    expect(screen.getByText('Нет сети')).toBeDefined()
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

  it('вызывает deleteSupplier при клике «Удалить»', async () => {
    const deleteSupplier = vi.fn().mockResolvedValue(undefined)
    useSuppliers.mockReturnValue(defaultMock({ suppliers: mockSuppliers, deleteSupplier }))
    render(<SuppliersPage />)
    const deleteBtns = screen.getAllByText('Удалить')
    fireEvent.click(deleteBtns[0])
    await waitFor(() => expect(deleteSupplier).toHaveBeenCalledWith('1'))
  })
})
