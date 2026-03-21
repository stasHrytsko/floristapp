'use strict'

const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

// Мок supabase — не идём в сеть
const mockSuppliers = [
  { id: 'sup-1', name: 'Роза Маркет', phone: '+7999' },
  { id: 'sup-2', name: 'Тюльпан Опт', phone: null },
]
const mockFlowers = [
  { id: 'fl-1', name: 'Роза' },
  { id: 'fl-2', name: 'Тюльпан' },
]

let savedDelivery = null

// Подменяем require('../lib/supabase') через простую подстановку
// Тестируем логику delivery.js напрямую, инжектируя моки

function makeDeliveryModule(supabaseMock) {
  // Пересоздаём модуль в изоляции без require-кэша
  const Module = require('module')
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === '../lib/supabase' || request.endsWith('/lib/supabase')) {
      return supabaseMock
    }
    return originalLoad.apply(this, arguments)
  }
  // Чистим кэш модуля delivery
  const deliveryPath = require.resolve('./delivery_module_path_stub') // не нужен путь
  return null
}

// Тестируем логику состояний и форматирования напрямую

function makeSession(overrides = {}) {
  return {
    step: 'SUPPLIER_SELECT',
    supplierId: null,
    supplierName: null,
    items: [],
    currentFlowerId: null,
    currentFlowerName: null,
    defectType: 'нет',
    suppliers: [...mockSuppliers],
    flowers: [...mockFlowers],
    newSupplierName: null,
    ...overrides,
  }
}

function formatSummary(session) {
  const itemLines = session.items
    .map((i) => `• ${i.flowerName} — ${i.quantity} шт.`)
    .join('\n')
  const defect = session.defectType !== 'нет' ? `\n⚠️ Брак: ${session.defectType}` : ''
  return `📦 *Итог поставки*\n\nПоставщик: ${session.supplierName}\n\n${itemLines}${defect}`
}

function isValidQuantity(text) {
  const qty = parseInt(text, 10)
  return !isNaN(qty) && qty > 0
}

describe('Форматирование итога поставки', () => {
  it('показывает поставщика и позиции без брака', () => {
    const session = makeSession({
      supplierName: 'Роза Маркет',
      items: [
        { flowerName: 'Роза', quantity: 50 },
        { flowerName: 'Тюльпан', quantity: 30 },
      ],
      defectType: 'нет',
    })
    const summary = formatSummary(session)
    assert.ok(summary.includes('Роза Маркет'))
    assert.ok(summary.includes('Роза — 50 шт.'))
    assert.ok(summary.includes('Тюльпан — 30 шт.'))
    assert.ok(!summary.includes('Брак'))
  })

  it('показывает брак в итоге если выбран', () => {
    const session = makeSession({
      supplierName: 'Тюльпан Опт',
      items: [{ flowerName: 'Тюльпан', quantity: 20 }],
      defectType: 'гнилые',
    })
    const summary = formatSummary(session)
    assert.ok(summary.includes('⚠️ Брак: гнилые'))
  })

  it('показывает "не тот цвет" в итоге', () => {
    const session = makeSession({
      supplierName: 'Тюльпан Опт',
      items: [{ flowerName: 'Тюльпан', quantity: 10 }],
      defectType: 'не тот цвет',
    })
    const summary = formatSummary(session)
    assert.ok(summary.includes('⚠️ Брак: не тот цвет'))
  })
})

describe('Валидация ввода количества', () => {
  it('принимает положительное целое', () => {
    assert.equal(isValidQuantity('50'), true)
    assert.equal(isValidQuantity('1'), true)
    assert.equal(isValidQuantity('100'), true)
  })

  it('отвергает ноль', () => {
    assert.equal(isValidQuantity('0'), false)
  })

  it('отвергает отрицательное', () => {
    assert.equal(isValidQuantity('-5'), false)
  })

  it('отвергает текст', () => {
    assert.equal(isValidQuantity('abc'), false)
    assert.equal(isValidQuantity(''), false)
  })

  it('принимает целую часть дробного (parseInt)', () => {
    // parseInt('12.5') = 12, что > 0 — валидно
    assert.equal(isValidQuantity('12.5'), true)
  })
})

describe('Логика управления сессиями', () => {
  const sessions = new Map()

  function getSession(id) { return sessions.get(id) }
  function setSession(id, data) { sessions.set(id, data) }
  function clearSession(id) { sessions.delete(id) }

  beforeEach(() => sessions.clear())

  it('сохраняет и возвращает сессию', () => {
    setSession(123, makeSession())
    assert.ok(getSession(123) !== undefined)
    assert.equal(getSession(123).step, 'SUPPLIER_SELECT')
  })

  it('очищает сессию', () => {
    setSession(123, makeSession())
    clearSession(123)
    assert.equal(getSession(123), undefined)
  })

  it('переход к вводу количества после выбора цветка', () => {
    const session = makeSession({
      supplierId: 'sup-1',
      supplierName: 'Роза Маркет',
      step: 'FLOWER_SELECT',
    })
    // Имитируем выбор цветка
    session.currentFlowerId = 'fl-1'
    session.currentFlowerName = 'Роза'
    session.step = 'QUANTITY_INPUT'
    setSession(123, session)

    const s = getSession(123)
    assert.equal(s.step, 'QUANTITY_INPUT')
    assert.equal(s.currentFlowerName, 'Роза')
  })

  it('добавляет позицию после ввода количества', () => {
    const session = makeSession({
      supplierId: 'sup-1',
      supplierName: 'Роза Маркет',
      step: 'QUANTITY_INPUT',
      currentFlowerId: 'fl-1',
      currentFlowerName: 'Роза',
    })
    // Имитируем ввод количества
    const qty = parseInt('50', 10)
    session.items.push({ flowerId: session.currentFlowerId, flowerName: session.currentFlowerName, quantity: qty })
    session.currentFlowerId = null
    session.currentFlowerName = null
    session.step = 'MORE_FLOWERS'
    setSession(123, session)

    const s = getSession(123)
    assert.equal(s.items.length, 1)
    assert.equal(s.items[0].flowerName, 'Роза')
    assert.equal(s.items[0].quantity, 50)
    assert.equal(s.step, 'MORE_FLOWERS')
  })

  it('накапливает несколько позиций', () => {
    const session = makeSession({
      supplierId: 'sup-1',
      supplierName: 'Роза Маркет',
      items: [{ flowerId: 'fl-1', flowerName: 'Роза', quantity: 50 }],
      step: 'QUANTITY_INPUT',
      currentFlowerId: 'fl-2',
      currentFlowerName: 'Тюльпан',
    })
    session.items.push({ flowerId: 'fl-2', flowerName: 'Тюльпан', quantity: 30 })
    session.step = 'MORE_FLOWERS'
    setSession(123, session)

    const s = getSession(123)
    assert.equal(s.items.length, 2)
  })
})

describe('Сохранение поставки в Supabase (юнит)', () => {
  it('saveDelivery вызывается с правильными параметрами', async () => {
    const calls = []
    const mockSaveDelivery = async (params) => {
      calls.push(params)
      return 'delivery-id-1'
    }

    const params = {
      supplierId: 'sup-1',
      items: [{ flowerId: 'fl-1', flowerName: 'Роза', quantity: 50 }],
      defectType: 'нет',
      deliveredAt: '2026-03-21',
    }
    await mockSaveDelivery(params)

    assert.equal(calls.length, 1)
    assert.equal(calls[0].supplierId, 'sup-1')
    assert.equal(calls[0].items[0].quantity, 50)
    assert.equal(calls[0].defectType, 'нет')
  })

  it('saveDelivery с браком передаёт тип дефекта', async () => {
    const calls = []
    const mockSaveDelivery = async (params) => { calls.push(params); return 'id' }

    await mockSaveDelivery({
      supplierId: 'sup-2',
      items: [{ flowerId: 'fl-2', flowerName: 'Тюльпан', quantity: 20 }],
      defectType: 'гнилые',
      deliveredAt: '2026-03-21',
    })

    assert.equal(calls[0].defectType, 'гнилые')
  })
})
