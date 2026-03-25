import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WriteOffPage from '../pages/WriteOffPage'

vi.mock('../hooks/useWriteOffs', () => ({ useWriteOffs: vi.fn() }))
vi.mock('../hooks/useWriteOff', () => ({ useWriteOff: vi.fn() }))
vi.mock('../hooks/useFlowerStock', () => ({ useFlowerStock: vi.fn() }))

import { useWriteOffs } from '../hooks/useWriteOffs'
import { useWriteOff } from '../hooks/useWriteOff'
import { useFlowerStock } from '../hooks/useFlowerStock'

const mockFlowers = [
  { flower_id: 'f1', name: 'Роза', total: 10, reserved: 0, free: 10 },
  { flower_id: 'f2', name: 'Тюльпан', total: 5, reserved: 0, free: 5 },
]

const mockWriteOffs = [
  {
    id: 'w1',
    quantity: 5,
    comment: 'начали вянуть',
    created_at: '2026-03-19T10:00:00Z',
    flowers: { id: 'f1', name: 'Роза' },
  },
  {
    id: 'w2',
    quantity: 3,
    comment: null,
    created_at: '2026-03-19T09:00:00Z',
    flowers: { id: 'f2', name: 'Тюльпан' },
  },
  {
    id: 'w3',
    quantity: 2,
    comment: 'повреждены',
    created_at: '2026-03-18T10:00:00Z',
    flowers: { id: 'f1', name: 'Роза' },
  },
]

function setup(createOverride) {
  const createWriteOff = createOverride ?? vi.fn().mockResolvedValue(undefined)
  useWriteOffs.mockReturnValue({ writeOffs: mockWriteOffs, loading: false, error: null, refresh: vi.fn() })
  useWriteOff.mockReturnValue({ createWriteOff })
  useFlowerStock.mockReturnValue({ flowers: mockFlowers, loading: false, error: null })
  return { createWriteOff }
}

describe('WriteOffPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает кнопку «+ Списать»', () => {
    setup()
    render(<WriteOffPage />)
    expect(screen.getByText(/\+ Списать/)).toBeDefined()
  })

  it('показывает загрузку', () => {
    useWriteOffs.mockReturnValue({ writeOffs: [], loading: true, error: null, refresh: vi.fn() })
    useWriteOff.mockReturnValue({ createWriteOff: vi.fn() })
    useFlowerStock.mockReturnValue({ flowers: [], loading: false })
    render(<WriteOffPage />)
    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('показывает историю сгруппированную по датам', () => {
    setup()
    render(<WriteOffPage />)
    // Two different dates
    const dates = screen.getAllByText(/\d{2}\.\d{2}\.\d{4}/)
    expect(dates.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Роза — 5 шт/)).toBeDefined()
    expect(screen.getByText(/Тюльпан — 3 шт/)).toBeDefined()
  })

  it('показывает сообщение при пустой истории', () => {
    useWriteOffs.mockReturnValue({ writeOffs: [], loading: false, error: null, refresh: vi.fn() })
    useWriteOff.mockReturnValue({ createWriteOff: vi.fn() })
    useFlowerStock.mockReturnValue({ flowers: [], loading: false })
    render(<WriteOffPage />)
    expect(screen.getByText(/списаний нет/i)).toBeDefined()
  })

  it('открывает форму при клике «+ Списать»', () => {
    setup()
    render(<WriteOffPage />)
    fireEvent.click(screen.getByText(/\+ Списать/))
    expect(screen.getByText('Новое списание')).toBeDefined()
    expect(screen.getByPlaceholderText('шт')).toBeDefined()
  })

  it('открывает форму при addFormOpen=true', () => {
    setup()
    render(<WriteOffPage addFormOpen={true} onAddFormClose={vi.fn()} />)
    expect(screen.getByText('Новое списание')).toBeDefined()
  })

  it('кнопка «Сохранить» заблокирована при незаполненной форме', () => {
    setup()
    render(<WriteOffPage />)
    fireEvent.click(screen.getByText(/\+ Списать/))
    const btn = screen.getByRole('button', { name: /сохранить/i })
    expect(btn.disabled).toBe(true)
  })

  it('вызывает createWriteOff с корректными данными', async () => {
    const { createWriteOff } = setup()
    render(<WriteOffPage />)
    fireEvent.click(screen.getByText(/\+ Списать/))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'f1' } })
    fireEvent.change(screen.getByPlaceholderText('шт'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('Необязательно'), { target: { value: 'вянут' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))
    await waitFor(() =>
      expect(createWriteOff).toHaveBeenCalledWith({ flowerId: 'f1', quantity: 5, comment: 'вянут' })
    )
  })

  it('закрывает форму после успешного сохранения', async () => {
    setup()
    render(<WriteOffPage />)
    fireEvent.click(screen.getByText(/\+ Списать/))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'f1' } })
    fireEvent.change(screen.getByPlaceholderText('шт'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))
    await waitFor(() => expect(screen.queryByText('Новое списание')).toBeNull())
  })

  it('показывает ошибку при неудачном сохранении', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Нет сети')))
    render(<WriteOffPage />)
    fireEvent.click(screen.getByText(/\+ Списать/))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'f1' } })
    fireEvent.change(screen.getByPlaceholderText('шт'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))
    await waitFor(() => expect(screen.getByText('Нет сети')).toBeDefined())
  })
})
