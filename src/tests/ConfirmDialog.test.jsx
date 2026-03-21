import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from '../components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('показывает сообщение', () => {
    render(<ConfirmDialog message="Удалить?" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Удалить?')).toBeDefined()
  })

  it('вызывает onConfirm при клике «Да»', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog message="Удалить?" onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^да$/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('вызывает onCancel при клике «Отмена»', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog message="Удалить?" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /отмена/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
