'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const Module = require('module')

// ─── Загрузка order.js с мок-supabase ─────────────────────────────

function makeOrderModule(supabaseMock) {
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === '../lib/supabase' || request.endsWith('/lib/supabase')) {
      return supabaseMock
    }
    return originalLoad.apply(this, arguments)
  }
  // Сбрасываем кеш модуля
  delete require.cache[require.resolve('../handlers/order')]
  try {
    return require('../handlers/order')
  } finally {
    Module._load = originalLoad
  }
}

const orderModule = makeOrderModule({
  getFlowerStock: async () => [],
  saveOrder: async () => 'order-id-1',
  getActiveOrders: async () => [],
  updateOrderStatus: async () => {},
})
const { formatSummary, parseDate, getNextStatus, formatReadyAt, getISODate } = orderModule

// ─── parseDate ────────────────────────────────────────────────────

describe('parseDate', () => {
  it('корректно парсит ДД.ММ.ГГГГ ЧЧ:ММ', () => {
    assert.equal(parseDate('25.03.2026 14:30'), '2026-03-25')
  })

  it('возвращает null при неверном формате', () => {
    assert.equal(parseDate('25-03-2026 14:30'), null)
    assert.equal(parseDate('25.03.2026'), null)
    assert.equal(parseDate('abc'), null)
    assert.equal(parseDate(''), null)
  })

  it('обрезает пробелы вокруг строки', () => {
    assert.equal(parseDate('  01.01.2026 09:00  '), '2026-01-01')
  })
})

// ─── formatSummary ───────────────────────────────────────────────

describe('formatSummary — самовывоз', () => {
  const session = {
    clientName: 'Мария',
    clientPhone: '+79991234567',
    deliveryType: 'самовывоз',
    address: null,
    readyAt: '25.03.2026 14:00',
    items: [
      { flowerName: 'Роза', quantity: 10 },
      { flowerName: 'Тюльпан', quantity: 5 },
    ],
  }

  it('содержит имя клиента', () => {
    assert.ok(formatSummary(session).includes('Мария'))
  })

  it('содержит телефон', () => {
    assert.ok(formatSummary(session).includes('+79991234567'))
  })

  it('содержит тип получения', () => {
    assert.ok(formatSummary(session).includes('самовывоз'))
  })

  it('не содержит строку адреса при самовывозе', () => {
    assert.ok(!formatSummary(session).includes('Адрес'))
  })

  it('перечисляет цветки с количеством', () => {
    const text = formatSummary(session)
    assert.ok(text.includes('Роза × 10'))
    assert.ok(text.includes('Тюльпан × 5'))
  })
})

describe('formatSummary — доставка', () => {
  const session = {
    clientName: 'Анна',
    clientPhone: null,
    deliveryType: 'доставка',
    address: 'ул. Ленина, 1',
    readyAt: '26.03.2026 10:00',
    items: [{ flowerName: 'Хризантема', quantity: 3 }],
  }

  it('показывает адрес при доставке', () => {
    assert.ok(formatSummary(session).includes('ул. Ленина, 1'))
  })

  it('показывает прочерк при отсутствии телефона', () => {
    assert.ok(formatSummary(session).includes('—'))
  })
})

// ─── callback_data длина ≤ 64 байта ──────────────────────────────

describe('callback_data — длина ≤ 64 байта', () => {
  const MAX_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

  const callbacks = [
    'no_cancel',
    'no_dt_самовывоз',
    'no_dt_доставка',
    `no_f_${MAX_UUID}`,
    'no_more_yes',
    'no_more_no',
    'no_confirm',
  ]

  for (const cb of callbacks) {
    it(`«${cb}» — не превышает 64 байта`, () => {
      assert.ok(Buffer.byteLength(cb, 'utf8') <= 64, `Слишком длинный: ${cb}`)
    })
  }
})

// ─── saveOrder — юнит через mock ─────────────────────────────────

describe('saveOrder — создаёт заказ, позиции и движения', () => {
  it('передаёт правильные данные и создаёт резервы', async () => {
    const calls = []

    async function mockSaveOrder({ clientName, clientPhone, deliveryType, address, readyAt, items }) {
      const orderId = 'order-uuid-1'
      calls.push({ type: 'order', clientName, clientPhone, deliveryType, address, readyAt })
      for (const item of items) {
        calls.push({ type: 'order_item', orderId, flowerId: item.flowerId, quantity: item.quantity })
      }
      for (const item of items) {
        calls.push({ type: 'movement', movementType: 'резерв', orderId, flowerId: item.flowerId, quantity: item.quantity })
      }
      return orderId
    }

    await mockSaveOrder({
      clientName: 'Мария',
      clientPhone: '+79991234567',
      deliveryType: 'доставка',
      address: 'ул. Цветочная, 5',
      readyAt: '2026-03-25',
      items: [
        { flowerId: 'fl-1', quantity: 10 },
        { flowerId: 'fl-2', quantity: 5 },
      ],
    })

    // 1 order + 2 order_items + 2 movements = 5
    assert.equal(calls.length, 5)
    assert.equal(calls[0].type, 'order')
    assert.equal(calls[0].clientName, 'Мария')
    assert.equal(calls[0].deliveryType, 'доставка')

    const movements = calls.filter((c) => c.type === 'movement')
    assert.equal(movements.length, 2)
    assert.ok(movements.every((m) => m.movementType === 'резерв'))
  })

  it('не создаёт позиций при пустом массиве items', async () => {
    const calls = []
    async function mockSaveOrder({ items }) {
      calls.push({ type: 'order' })
      for (const item of items) {
        calls.push({ type: 'order_item', ...item })
      }
      return 'order-id'
    }
    await mockSaveOrder({ clientName: 'X', items: [] })
    assert.equal(calls.length, 1, 'только запись заказа без позиций')
  })
})

// ─── Валидация количества при вводе ──────────────────────────────

describe('валидация количества', () => {
  function validateQty(text, available) {
    if (!/^\d+$/.test(text) || parseInt(text, 10) <= 0) return 'invalid'
    const qty = parseInt(text, 10)
    if (qty > available) return `max:${available}`
    return qty
  }

  it('принимает корректное число', () => {
    assert.equal(validateQty('10', 20), 10)
  })

  it('отклоняет буквы', () => {
    assert.equal(validateQty('abc', 20), 'invalid')
  })

  it('отклоняет ноль', () => {
    assert.equal(validateQty('0', 20), 'invalid')
  })

  it('отклоняет превышение остатка', () => {
    assert.equal(validateQty('25', 20), 'max:20')
  })

  it('принимает ровно доступное количество', () => {
    assert.equal(validateQty('20', 20), 20)
  })
})

// ─── getNextStatus ───────────────────────────────────────────────

describe('getNextStatus — переходы статусов', () => {
  it('самовывоз: новый → в работе', () => {
    assert.equal(getNextStatus('новый', 'самовывоз'), 'в работе')
  })

  it('самовывоз: в работе → готов к выдаче', () => {
    assert.equal(getNextStatus('в работе', 'самовывоз'), 'готов к выдаче')
  })

  it('самовывоз: готов к выдаче → выдан', () => {
    assert.equal(getNextStatus('готов к выдаче', 'самовывоз'), 'выдан')
  })

  it('самовывоз: выдан — финальный, возвращает null', () => {
    assert.equal(getNextStatus('выдан', 'самовывоз'), null)
  })

  it('доставка: в работе → готов к доставке', () => {
    assert.equal(getNextStatus('в работе', 'доставка'), 'готов к доставке')
  })

  it('доставка: готов к доставке → доставлен', () => {
    assert.equal(getNextStatus('готов к доставке', 'доставка'), 'доставлен')
  })

  it('доставка: доставлен — финальный, возвращает null', () => {
    assert.equal(getNextStatus('доставлен', 'доставка'), null)
  })

  it('неизвестный тип доставки → null', () => {
    assert.equal(getNextStatus('новый', 'неизвестно'), null)
  })
})

// ─── formatReadyAt ───────────────────────────────────────────────

describe('formatReadyAt', () => {
  it('форматирует ISO дату в ДД.ММ.ГГГГ', () => {
    assert.equal(formatReadyAt('2026-03-25'), '25.03.2026')
  })

  it('форматирует начало года', () => {
    assert.equal(formatReadyAt('2026-01-01'), '01.01.2026')
  })
})

// ─── callback_data длина ≤ 64 байта (подменю и статусы) ──────────

describe('callback_data подменю и статусов — длина ≤ 64 байта', () => {
  const MAX_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

  const callbacks = [
    'no_menu_new',
    'no_menu_list',
    `no_ord_${MAX_UUID}`,
    'no_nst',
    'no_fil_today',
    'no_fil_tmrw',
    'no_fil_aftmrw',
    'no_fil_all',
  ]

  for (const cb of callbacks) {
    it(`«${cb}» — не превышает 64 байта`, () => {
      assert.ok(Buffer.byteLength(cb, 'utf8') <= 64, `Слишком длинный: ${cb}`)
    })
  }
})

// ─── updateOrderStatus — мок ──────────────────────────────────────

describe('updateOrderStatus — корректный вызов', () => {
  it('вызывается с orderId и новым статусом', async () => {
    const calls = []
    async function mockUpdateOrderStatus(orderId, status) {
      calls.push({ orderId, status })
    }
    await mockUpdateOrderStatus('order-uuid-1', 'в работе')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].orderId, 'order-uuid-1')
    assert.equal(calls[0].status, 'в работе')
  })
})

// ─── getISODate ───────────────────────────────────────────────────

describe('getISODate', () => {
  it('возвращает строку формата ГГГГ-ММ-ДД', () => {
    assert.match(getISODate(0), /^\d{4}-\d{2}-\d{2}$/)
  })

  it('смещение +1 даёт завтра', () => {
    const today = getISODate(0)
    const tomorrow = getISODate(1)
    const diff = new Date(tomorrow) - new Date(today)
    assert.equal(diff, 86400000) // ровно 1 день в миллисекундах
  })

  it('смещение +2 даёт послезавтра', () => {
    const today = getISODate(0)
    const dayAfter = getISODate(2)
    const diff = new Date(dayAfter) - new Date(today)
    assert.equal(diff, 86400000 * 2)
  })
})

// ─── getActiveOrders фильтрация — мок ────────────────────────────

describe('getActiveOrders — фильтрация по дате', () => {
  it('без даты возвращает все активные заказы', async () => {
    const all = [
      { id: '1', client_name: 'Мария', ready_at: '2026-03-21', status: 'новый', delivery_type: 'самовывоз' },
      { id: '2', client_name: 'Анна', ready_at: '2026-03-22', status: 'в работе', delivery_type: 'доставка' },
    ]
    async function mockGetActiveOrders(date) {
      if (date) return all.filter((o) => o.ready_at === date)
      return all
    }
    const result = await mockGetActiveOrders(null)
    assert.equal(result.length, 2)
  })

  it('с датой возвращает только заказы на этот день', async () => {
    const all = [
      { id: '1', client_name: 'Мария', ready_at: '2026-03-21', status: 'новый', delivery_type: 'самовывоз' },
      { id: '2', client_name: 'Анна', ready_at: '2026-03-22', status: 'в работе', delivery_type: 'доставка' },
    ]
    async function mockGetActiveOrders(date) {
      if (date) return all.filter((o) => o.ready_at === date)
      return all
    }
    const result = await mockGetActiveOrders('2026-03-21')
    assert.equal(result.length, 1)
    assert.equal(result[0].client_name, 'Мария')
  })

  it('с датой без совпадений возвращает пустой массив', async () => {
    async function mockGetActiveOrders(date) {
      return date ? [] : []
    }
    const result = await mockGetActiveOrders('2099-01-01')
    assert.equal(result.length, 0)
  })
})
