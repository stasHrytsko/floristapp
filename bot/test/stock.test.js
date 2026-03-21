'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const Module = require('module')

// ─── Загрузка stock.js с мок-supabase ─────────────────────────────

function makeStockModule(supabaseMock) {
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === '../lib/supabase' || request.endsWith('/lib/supabase')) {
      return supabaseMock
    }
    return originalLoad.apply(this, arguments)
  }
  delete require.cache[require.resolve('../handlers/stock')]
  try {
    return require('../handlers/stock')
  } finally {
    Module._load = originalLoad
  }
}

const { formatAllStock, formatLowStock, formatFlowerDetail, formatStorage, storageIndicator, daysOnStorage } = makeStockModule({
  getAllStock: async () => [],
  getLowStock: async () => [],
  searchFlowers: async () => [],
  getFlowerStockById: async () => null,
  getActiveBatches: async () => [],
})

// ─── formatAllStock ───────────────────────────────────────────────

describe('formatAllStock', () => {
  it('пустой список → сообщение об отсутствии данных', () => {
    assert.equal(formatAllStock([]), 'Нет данных об остатках.')
  })

  it('показывает название, свободно и зарезервировано', () => {
    const stock = [
      { name: 'Роза', available: 20, reserved: 5 },
      { name: 'Тюльпан', available: 3, reserved: 0 },
    ]
    const text = formatAllStock(stock)
    assert.ok(text.includes('Роза'))
    assert.ok(text.includes('20 свободно'))
    assert.ok(text.includes('5 зарезервировано'))
    assert.ok(text.includes('Тюльпан'))
    assert.ok(text.includes('3 свободно'))
  })

  it('начинается с заголовка', () => {
    const stock = [{ name: 'Роза', available: 1, reserved: 0 }]
    assert.ok(formatAllStock(stock).startsWith('🌸 Все остатки'))
  })

  it('каждый цветок на новой строке с маркером', () => {
    const stock = [
      { name: 'Роза', available: 10, reserved: 2 },
      { name: 'Ирис', available: 5, reserved: 1 },
    ]
    const text = formatAllStock(stock)
    assert.equal((text.match(/^• /gm) || []).length, 2)
  })
})

// ─── formatLowStock ───────────────────────────────────────────────

describe('formatLowStock', () => {
  it('пустой список → всё в порядке', () => {
    assert.equal(formatLowStock([]), '✅ Все цветки в достаточном количестве.')
  })

  it('показывает цветки с низким остатком', () => {
    const stock = [
      { name: 'Тюльпан', available: 2 },
      { name: 'Хризантема', available: 0 },
    ]
    const text = formatLowStock(stock)
    assert.ok(text.includes('Тюльпан'))
    assert.ok(text.includes('2 свободно'))
    assert.ok(text.includes('Хризантема'))
    assert.ok(text.includes('0 свободно'))
  })

  it('начинается с заголовка предупреждения', () => {
    const stock = [{ name: 'Роза', available: 1 }]
    assert.ok(formatLowStock(stock).startsWith('⚠️ Заканчивается'))
  })
})

// ─── formatFlowerDetail ───────────────────────────────────────────

describe('formatFlowerDetail', () => {
  const flower = { name: 'Роза', total: 25, reserved: 5, available: 20 }

  it('содержит название цветка', () => {
    assert.ok(formatFlowerDetail(flower).includes('Роза'))
  })

  it('показывает все три показателя', () => {
    const text = formatFlowerDetail(flower)
    assert.ok(text.includes('Всего: 25'))
    assert.ok(text.includes('Зарезервировано: 5'))
    assert.ok(text.includes('Свободно: 20'))
  })

  it('каждый показатель на отдельной строке', () => {
    const lines = formatFlowerDetail(flower).split('\n')
    assert.equal(lines.length, 4)
  })
})

// ─── callback_data длина ≤ 64 байта ──────────────────────────────

describe('callback_data — длина ≤ 64 байта', () => {
  const MAX_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

  const callbacks = [
    'st_cancel',
    'st_all',
    'st_low',
    'st_search',
    'st_storage',
    `st_fl_${MAX_UUID}`,
  ]

  for (const cb of callbacks) {
    it(`«${cb}» — не превышает 64 байта`, () => {
      assert.ok(Buffer.byteLength(cb, 'utf8') <= 64, `Слишком длинный: ${cb}`)
    })
  }
})

// ─── storageIndicator ─────────────────────────────────────────────

describe('storageIndicator', () => {
  it('0 дней → 🟢', () => assert.equal(storageIndicator(0), '🟢'))
  it('10 дней → 🟢', () => assert.equal(storageIndicator(10), '🟢'))
  it('11 дней → 🟡', () => assert.equal(storageIndicator(11), '🟡'))
  it('20 дней → 🟡', () => assert.equal(storageIndicator(20), '🟡'))
  it('21 день → 🔴', () => assert.equal(storageIndicator(21), '🔴'))
  it('30 дней → 🔴', () => assert.equal(storageIndicator(30), '🔴'))
})

// ─── daysOnStorage ────────────────────────────────────────────────

describe('daysOnStorage', () => {
  it('сегодняшняя дата → 0 дней', () => {
    const now = new Date()
    const isoToday = now.toISOString().slice(0, 10)
    assert.equal(daysOnStorage(isoToday), 0)
  })

  it('вчерашняя дата → 1 день', () => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 1)
    assert.equal(daysOnStorage(d.toISOString().slice(0, 10)), 1)
  })

  it('15 дней назад → 15 дней', () => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 15)
    assert.equal(daysOnStorage(d.toISOString().slice(0, 10)), 15)
  })
})

// ─── formatStorage ────────────────────────────────────────────────

describe('formatStorage', () => {
  it('пустой список → сообщение об отсутствии партий', () => {
    assert.equal(formatStorage([]), 'Нет партий на складе.')
  })

  it('начинается с заголовка', () => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 5)
    const batch = {
      delivered_at: d.toISOString().slice(0, 10),
      flowers: { name: 'Роза' },
      suppliers: { name: 'Марина' },
    }
    assert.ok(formatStorage([batch]).startsWith('🕐 Хранение'))
  })

  it('содержит название цветка, поставщика и дней', () => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 5)
    const batch = {
      delivered_at: d.toISOString().slice(0, 10),
      flowers: { name: 'Тюльпан' },
      suppliers: { name: 'Карлос' },
    }
    const text = formatStorage([batch])
    assert.ok(text.includes('Тюльпан'))
    assert.ok(text.includes('Карлос'))
    assert.ok(text.includes('5 дн.'))
  })

  it('партия 5 дней → 🟢', () => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 5)
    const batch = {
      delivered_at: d.toISOString().slice(0, 10),
      flowers: { name: 'Роза' },
      suppliers: { name: 'Марина' },
    }
    assert.ok(formatStorage([batch]).includes('🟢'))
  })

  it('партия 15 дней → 🟡', () => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 15)
    const batch = {
      delivered_at: d.toISOString().slice(0, 10),
      flowers: { name: 'Пион' },
      suppliers: { name: 'Анна' },
    }
    assert.ok(formatStorage([batch]).includes('🟡'))
  })

  it('партия 25 дней → 🔴', () => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 25)
    const batch = {
      delivered_at: d.toISOString().slice(0, 10),
      flowers: { name: 'Хризантема' },
      suppliers: { name: 'Борис' },
    }
    assert.ok(formatStorage([batch]).includes('🔴'))
  })

  it('дата форматируется как ДД.ММ', () => {
    const batch = {
      delivered_at: '2026-03-01',
      flowers: { name: 'Роза' },
      suppliers: { name: 'Марина' },
    }
    assert.ok(formatStorage([batch]).includes('01.03'))
  })
})

// ─── handleText — поиск ───────────────────────────────────────────

describe('handleText — поиск цветка', () => {
  it('пустой запрос — возвращает запрос ввести букву', async () => {
    const replies = []
    const ctx = {
      from: { id: 42 },
      message: { text: '   ' },
      reply: (text) => { replies.push(text); return Promise.resolve() },
    }

    // Загружаем модуль с пустой сессией SEARCH_INPUT
    const mod = makeStockModule({
      searchFlowers: async () => [],
      getAllStock: async () => [],
      getLowStock: async () => [],
      getFlowerStockById: async () => null,
    })

    // Внедряем сессию вручную через startStock
    const startCtx = {
      from: { id: 42 },
      reply: () => Promise.resolve(),
    }
    await mod.startStock(startCtx)

    // Переводим в SEARCH_INPUT через мок-callback (имитируем клик st_search)
    const cbCtx = {
      from: { id: 42 },
      callbackQuery: { data: 'st_search' },
      answerCbQuery: () => Promise.resolve(),
      editMessageText: () => Promise.resolve(),
      reply: () => Promise.resolve(),
    }
    await mod.handleCallbackQuery(cbCtx)

    // Теперь handleText должен обработать пустой запрос
    const handled = await mod.handleText(ctx)
    assert.equal(handled, true)
    assert.ok(replies[0].includes('букву'))
  })

  it('нет совпадений — остаётся в шаге ввода и сообщает', async () => {
    const replies = []
    const mod = makeStockModule({
      searchFlowers: async () => [],
      getAllStock: async () => [],
      getLowStock: async () => [],
      getFlowerStockById: async () => null,
    })

    await mod.startStock({ from: { id: 99 }, reply: () => Promise.resolve() })
    await mod.handleCallbackQuery({
      from: { id: 99 },
      callbackQuery: { data: 'st_search' },
      answerCbQuery: () => Promise.resolve(),
      editMessageText: () => Promise.resolve(),
      reply: () => Promise.resolve(),
    })

    const ctx = {
      from: { id: 99 },
      message: { text: 'зз' },
      reply: (text) => { replies.push(text); return Promise.resolve() },
    }
    const handled = await mod.handleText(ctx)
    assert.equal(handled, true)
    assert.ok(replies[0].includes('Ничего не найдено'))
  })

  it('есть совпадения — показывает кнопки выбора', async () => {
    const mockFlower = { flower_id: 'fl-1', name: 'Роза', available: 10 }
    const replyMarkups = []
    const mod = makeStockModule({
      searchFlowers: async () => [mockFlower],
      getAllStock: async () => [],
      getLowStock: async () => [],
      getFlowerStockById: async () => null,
    })

    await mod.startStock({ from: { id: 77 }, reply: () => Promise.resolve() })
    await mod.handleCallbackQuery({
      from: { id: 77 },
      callbackQuery: { data: 'st_search' },
      answerCbQuery: () => Promise.resolve(),
      editMessageText: () => Promise.resolve(),
      reply: () => Promise.resolve(),
    })

    const ctx = {
      from: { id: 77 },
      message: { text: 'Ро' },
      reply: (text, opts) => {
        replyMarkups.push(opts?.reply_markup)
        return Promise.resolve()
      },
    }
    const handled = await mod.handleText(ctx)
    assert.equal(handled, true)
    const buttons = replyMarkups[0]?.inline_keyboard?.flat()
    assert.ok(buttons.some((b) => b.callback_data === 'st_fl_fl-1'))
    assert.ok(buttons.some((b) => b.text.includes('Роза')))
    assert.ok(buttons.some((b) => b.text.includes('10')))
  })
})
