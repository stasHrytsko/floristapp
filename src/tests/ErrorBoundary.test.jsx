import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

function Bomb() {
  throw new Error('test crash')
}

// Suppress console.error for expected boundary errors
const originalError = console.error
beforeEach(() => { console.error = vi.fn() })
afterEach(() => { console.error = originalError })

describe('ErrorBoundary', () => {
  it('рендерит дочерние элементы без ошибок', () => {
    render(<ErrorBoundary><p>Содержимое</p></ErrorBoundary>)
    expect(screen.getByText('Содержимое')).toBeDefined()
  })

  it('показывает fallback при крэше дочернего компонента', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.getByText(/что-то пошло не так/i)).toBeDefined()
  })

  it('показывает кнопку «Перезагрузить»', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.getByRole('button', { name: /перезагрузить/i })).toBeDefined()
  })
})
