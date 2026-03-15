import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FlowerCard from '../components/FlowerCard'

const base = { flower_id: '1', name: 'Роза', total: 50, reserved: 10, available: 40, stale: false }

describe('FlowerCard', () => {
  it('отображает название и остатки', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.getByText('Роза')).toBeDefined()
    expect(screen.getByText('40')).toBeDefined()
    expect(screen.getByText('10')).toBeDefined()
    expect(screen.getByText('50')).toBeDefined()
  })

  it('не показывает предупреждение при норме', () => {
    render(<FlowerCard flower={base} />)
    expect(screen.queryByText(/⚠️/)).toBeNull()
  })

  it('показывает предупреждение "скоро завянет" при stale=true', () => {
    render(<FlowerCard flower={{ ...base, stale: true }} />)
    expect(screen.getByText(/скоро завянет/)).toBeDefined()
  })

  it('показывает предупреждение "дефицит" при available < 0', () => {
    render(<FlowerCard flower={{ ...base, available: -2 }} />)
    expect(screen.getByText(/дефицит/)).toBeDefined()
  })
})
