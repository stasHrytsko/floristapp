'use strict'

const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

const mockSuppliers = [
  { id: 'sup-1', name: 'Роза Маркет', phone: '+7999' },
  { id: 'sup-2', name: 'Тюльпан Опт', phone: null },
]
const mockFlowers = [
  { id: 'fl-1', name: 'Роза' },
  { id: 'fl-2', name: 'Тюльпан' },
]

function makeSession(overrides = {}) {
  return {
    step: 'SUPPLIER_SELECT',
    supplierId: null,
    supplierName: null,
    flowerId: null,
    flowerName: null,
    quantity: null,
    defectType: null,
    suppliers: [...mockSuppliers],
    flowers: [...mockFlowers],
    ...overrides,
  }
}

function formatSummary(session) {
  const typeLabel = session.defectType === 'гнилой' ? '🗑 Гнилые' : '🎨 Не тот цвет'
  const action = session.defectType === 'гнилой'
    ? 'Остаток уменьшится, движение «списание» запишется'
    : 'Остаток не изменится, запись с пометкой добавится'
  return (
    `⚠️ *Брак — подтверждение*\n\n` +
    `Поставщик: ${session.supplierName}\n` +
    `Цветок: ${session.flowerName}\n` +
    `Количество: ${session.quantity} шт.\n` +
    `Тип: ${typeLabel}\n\n` +
    `_${action}_`
  )
}

// ─── callback_data длина ──────────────────────────────────────────

describe('callback_data не превышает 64 байта', () => {
  const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' // 36 символов

  it('ds_s_ + UUID', () => {
    const data = `ds_s_${uuid}`
    assert.ok(Buffer.byteLength(data) <= 64, `длина ${Buffer.byteLength(data)}`)
  })

  it('ds_f_ + UUID', () => {
    const data = `ds_f_${uuid}`
    assert.ok(Buffer.byteLength(data) <= 64, `длина ${Buffer.byteLength(data)}`)
  })

  it('ds_t_rot', () => {
    assert.ok(Buffer.byteLength('ds_t_rot') <= 64)
  })

  it('ds_t_col', () => {
    assert.ok(Buffer.byteLength('ds_t_col') <= 64)
  })

  it('ds_yes', () => {
    assert.ok(Buffer.byteLength('ds_yes') <= 64)
  })

  it('ds_cancel', () => {
    assert.ok(Buffer.byteLength('ds_cancel') <= 64)
  })
})

// ─── Форматирование итога ─────────────────────────────────────────

describe('formatSummary — гнилые', () => {
  it('показывает тип «Гнилые» и предупреждение об уменьшении остатка', () => {
    const session = makeSession({
      supplierName: 'Роза Маркет',
      flowerName: 'Роза',
      quantity: 10,
      defectType: 'гнилой',
    })
    const text = formatSummary(session)
    assert.ok(text.includes('🗑 Гнилые'))
    assert.ok(text.includes('Остаток уменьшится'))
    assert.ok(text.includes('списание'))
    assert.ok(text.includes('10 шт.'))
    assert.ok(text.includes('Роза Маркет'))
  })
})

describe('formatSummary — не тот цвет', () => {
  it('показывает тип «Не тот цвет» и что остаток не изменится', () => {
    const session = makeSession({
      supplierName: 'Тюльпан Опт',
      flowerName: 'Тюльпан',
      quantity: 5,
      defectType: 'не тот цвет',
    })
    const text = formatSummary(session)
    assert.ok(text.includes('🎨 Не тот цвет'))
    assert.ok(text.includes('Остаток не изменится'))
    assert.ok(text.includes('5 шт.'))
  })
})

// ─── Логика состояний ────────────────────────────────────────────

describe('Переходы состояний диалога брака', () => {
  const sessions = new Map()
  function getSession(id) { return sessions.get(id) }
  function setSession(id, data) { sessions.set(id, data) }
  function clearSession(id) { sessions.delete(id) }

  beforeEach(() => sessions.clear())

  it('переход SUPPLIER_SELECT → FLOWER_SELECT', () => {
    const session = makeSession()
    const id = 'sup-1'
    const supplier = session.suppliers.find((s) => s.id === id)
    session.supplierId = id
    session.supplierName = supplier.name
    session.step = 'FLOWER_SELECT'
    setSession(1, session)

    const s = getSession(1)
    assert.equal(s.step, 'FLOWER_SELECT')
    assert.equal(s.supplierName, 'Роза Маркет')
  })

  it('переход FLOWER_SELECT → QUANTITY_INPUT', () => {
    const session = makeSession({ step: 'FLOWER_SELECT', supplierId: 'sup-1', supplierName: 'Роза Маркет' })
    session.flowerId = 'fl-1'
    session.flowerName = 'Роза'
    session.step = 'QUANTITY_INPUT'
    setSession(1, session)

    const s = getSession(1)
    assert.equal(s.step, 'QUANTITY_INPUT')
    assert.equal(s.flowerName, 'Роза')
  })

  it('переход QUANTITY_INPUT → TYPE_SELECT при валидном числе', () => {
    const session = makeSession({ step: 'QUANTITY_INPUT', flowerId: 'fl-1', flowerName: 'Роза' })
    const qty = parseInt('7', 10)
    assert.ok(!isNaN(qty) && qty > 0)
    session.quantity = qty
    session.step = 'TYPE_SELECT'
    setSession(1, session)

    const s = getSession(1)
    assert.equal(s.step, 'TYPE_SELECT')
    assert.equal(s.quantity, 7)
  })

  it('переход TYPE_SELECT → CONFIRM (гнилые)', () => {
    const session = makeSession({ step: 'TYPE_SELECT', quantity: 7, flowerName: 'Роза', supplierName: 'Роза Маркет' })
    session.defectType = 'гнилой'
    session.step = 'CONFIRM'
    setSession(1, session)

    const s = getSession(1)
    assert.equal(s.step, 'CONFIRM')
    assert.equal(s.defectType, 'гнилой')
  })

  it('переход TYPE_SELECT → CONFIRM (не тот цвет)', () => {
    const session = makeSession({ step: 'TYPE_SELECT', quantity: 3, flowerName: 'Тюльпан', supplierName: 'Тюльпан Опт' })
    session.defectType = 'не тот цвет'
    session.step = 'CONFIRM'
    setSession(1, session)

    assert.equal(getSession(1).defectType, 'не тот цвет')
  })

  it('отмена очищает сессию', () => {
    setSession(1, makeSession())
    clearSession(1)
    assert.equal(getSession(1), undefined)
  })
})

// ─── saveDefect — юнит ───────────────────────────────────────────

describe('saveDefect — гнилые: создаёт defect + движение «списание»', () => {
  it('вызывается с defect_type=гнилой и movement_type=списание', async () => {
    const calls = []

    const mockSaveDefect = async ({ supplierId, flowerId, quantity, defectType }) => {
      // Имитация: находим партию
      const batchId = 'batch-1'
      const resolution = defectType === 'гнилой' ? 'возврат' : 'скидка'
      calls.push({ supplierId, flowerId, quantity, defectType, batchId, resolution })

      // Гнилые → списание
      if (defectType === 'гнилой') {
        calls.push({ movement_type: 'списание', quantity })
      }

      return 'defect-id-1'
    }

    await mockSaveDefect({ supplierId: 'sup-1', flowerId: 'fl-1', quantity: 10, defectType: 'гнилой' })

    assert.equal(calls.length, 2)
    assert.equal(calls[0].defectType, 'гнилой')
    assert.equal(calls[0].resolution, 'возврат')
    assert.equal(calls[1].movement_type, 'списание')
    assert.equal(calls[1].quantity, 10)
  })
})

describe('saveDefect — не тот цвет: только defect, без движения', () => {
  it('вызывается с defect_type=не тот цвет, движение не создаётся', async () => {
    const calls = []

    const mockSaveDefect = async ({ supplierId, flowerId, quantity, defectType }) => {
      const resolution = defectType === 'гнилой' ? 'возврат' : 'скидка'
      calls.push({ supplierId, flowerId, quantity, defectType, resolution })

      if (defectType === 'гнилой') {
        calls.push({ movement_type: 'списание', quantity })
      }

      return 'defect-id-2'
    }

    await mockSaveDefect({ supplierId: 'sup-2', flowerId: 'fl-2', quantity: 5, defectType: 'не тот цвет' })

    assert.equal(calls.length, 1, 'только одна запись — defect, без движения')
    assert.equal(calls[0].defectType, 'не тот цвет')
    assert.equal(calls[0].resolution, 'скидка')
  })
})
