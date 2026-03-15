import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('PWA manifest', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(__dirname, '../../public/manifest.json'), 'utf-8')
  )

  it('содержит правильное название', () => {
    expect(manifest.name).toBe('FloristApp')
  })

  it('содержит theme_color', () => {
    expect(manifest.theme_color).toBeDefined()
  })

  it('содержит иконки 192 и 512', () => {
    const sizes = manifest.icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('display = standalone', () => {
    expect(manifest.display).toBe('standalone')
  })
})

describe('Service Worker', () => {
  it('файл sw.js существует', () => {
    const sw = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf-8')
    expect(sw).toBeTruthy()
  })

  it('sw.js не кэширует supabase запросы', () => {
    const sw = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf-8')
    expect(sw).toContain('supabase.co')
  })
})
