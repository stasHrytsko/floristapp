'use strict'

const { getFlowerStock, saveOrder, getActiveOrders, updateOrderStatus } = require('../lib/supabase')

const STEPS = {
  MENU: 'MENU',
  CLIENT_NAME: 'CLIENT_NAME',
  CLIENT_PHONE: 'CLIENT_PHONE',
  DELIVERY_TYPE: 'DELIVERY_TYPE',
  ADDRESS: 'ADDRESS',
  READY_AT: 'READY_AT',
  FLOWER_SELECT: 'FLOWER_SELECT',
  QUANTITY_INPUT: 'QUANTITY_INPUT',
  MORE_FLOWERS: 'MORE_FLOWERS',
  CONFIRM: 'CONFIRM',
  ORDER_LIST: 'ORDER_LIST',
  ORDER_STATUS: 'ORDER_STATUS',
}

// Самовывоз: новый → в работе → готов к выдаче → выдан
// Доставка:  новый → в работе → готов к доставке → доставлен
const STATUS_CHAIN = {
  самовывоз: ['новый', 'в работе', 'готов к выдаче', 'выдан'],
  доставка: ['новый', 'в работе', 'готов к доставке', 'доставлен'],
}

function getNextStatus(currentStatus, deliveryType) {
  const chain = STATUS_CHAIN[deliveryType]
  if (!chain) return null
  const idx = chain.indexOf(currentStatus)
  if (idx === -1 || idx === chain.length - 1) return null
  return chain[idx + 1]
}

// ISO дата ГГГГ-ММ-ДД → ДД.ММ.ГГГГ
function formatReadyAt(isoDate) {
  const [yyyy, mm, dd] = isoDate.split('-')
  return `${dd}.${mm}.${yyyy}`
}

const sessions = new Map()

function getSession(userId) {
  return sessions.get(userId)
}
function setSession(userId, session) {
  sessions.set(userId, session)
}
function clearSession(userId) {
  sessions.delete(userId)
}

const CANCEL_ROW = [{ text: '❌ Отмена', callback_data: 'no_cancel' }]

async function startOrder(ctx) {
  const userId = ctx.from.id
  setSession(userId, { step: STEPS.MENU })
  await ctx.reply('📋 Заказы:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📋 Новый заказ', callback_data: 'no_menu_new' },
          { text: '📂 Текущие заказы', callback_data: 'no_menu_list' },
        ],
        CANCEL_ROW,
      ],
    },
  })
}

function showDeliveryType(ctx) {
  return ctx.reply('Тип получения:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Самовывоз', callback_data: 'no_dt_самовывоз' },
          { text: 'Доставка', callback_data: 'no_dt_доставка' },
        ],
        CANCEL_ROW,
      ],
    },
  })
}

function showFlowerSelect(ctx, stock) {
  const buttons = stock.map((f) => [
    { text: `${f.name} (${f.available})`, callback_data: `no_f_${f.flower_id}` },
  ])
  buttons.push(CANCEL_ROW)
  return ctx.reply('Выбери цветок:', {
    reply_markup: { inline_keyboard: buttons },
  })
}

function showMoreFlowers(ctx) {
  return ctx.reply('Добавить ещё цветок?', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Да', callback_data: 'no_more_yes' },
          { text: 'Нет', callback_data: 'no_more_no' },
        ],
        CANCEL_ROW,
      ],
    },
  })
}

function formatSummary(session) {
  const lines = [
    `*Клиент:* ${session.clientName}`,
    `*Телефон:* ${session.clientPhone || '—'}`,
    `*Получение:* ${session.deliveryType}`,
  ]
  if (session.deliveryType === 'доставка') {
    lines.push(`*Адрес:* ${session.address || '—'}`)
  }
  lines.push(`*Готовность:* ${session.readyAt}`)
  lines.push('')
  lines.push('*Состав:*')
  for (const item of session.items) {
    lines.push(`• ${item.flowerName} × ${item.quantity}`)
  }
  return lines.join('\n')
}

function showConfirm(ctx, session) {
  return ctx.reply(`${formatSummary(session)}\n\nПодтвердить заказ?`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Подтвердить', callback_data: 'no_confirm' },
          { text: '❌ Отменить', callback_data: 'no_cancel' },
        ],
      ],
    },
  })
}

// Парсим ДД.ММ.ГГГГ ЧЧ:ММ → ISO дата ГГГГ-ММ-ДД
function parseDate(str) {
  const m = str.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})\s+\d{2}:\d{2}$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm}-${dd}`
}

async function handleCallbackQuery(ctx) {
  const data = ctx.callbackQuery.data
  if (!data.startsWith('no_')) return false

  const userId = ctx.from.id

  if (data === 'no_cancel') {
    clearSession(userId)
    await ctx.answerCbQuery()
    await ctx.editMessageText('❌ Заказ отменён.')
    return true
  }

  const session = getSession(userId)
  if (!session) {
    await ctx.answerCbQuery('Сессия истекла. Начни заново через меню.')
    return true
  }

  // ── Подменю ─────────────────────────────────────────────────────

  if (data === 'no_menu_new' && session.step === STEPS.MENU) {
    session.step = STEPS.CLIENT_NAME
    session.items = []
    session.stock = []
    setSession(userId, session)
    await ctx.answerCbQuery()
    await ctx.editMessageText('📋 Новый заказ')
    await ctx.reply('Введи имя клиента:', {
      reply_markup: { inline_keyboard: [CANCEL_ROW] },
    })
    return true
  }

  if (data === 'no_menu_list' && session.step === STEPS.MENU) {
    let orders
    try {
      orders = await getActiveOrders()
    } catch {
      await ctx.answerCbQuery()
      await ctx.reply('Ошибка загрузки заказов. Попробуй ещё раз.')
      return true
    }
    if (orders.length === 0) {
      await ctx.answerCbQuery()
      await ctx.editMessageText('Нет активных заказов.')
      clearSession(userId)
      return true
    }
    session.step = STEPS.ORDER_LIST
    session.activeOrders = orders
    setSession(userId, session)
    await ctx.answerCbQuery()
    const buttons = orders.map((o) => [
      {
        text: `${o.client_name} — ${formatReadyAt(o.ready_at)} (${o.status})`,
        callback_data: `no_ord_${o.id}`,
      },
    ])
    buttons.push(CANCEL_ROW)
    await ctx.editMessageText('Активные заказы:', {
      reply_markup: { inline_keyboard: buttons },
    })
    return true
  }

  // ── Выбор заказа из списка ───────────────────────────────────────

  if (data.startsWith('no_ord_') && session.step === STEPS.ORDER_LIST) {
    const orderId = data.slice(7)
    const found = session.activeOrders.find((o) => o.id === orderId)
    if (!found) {
      await ctx.answerCbQuery('Заказ не найден.')
      return true
    }
    const nextStatus = getNextStatus(found.status, found.delivery_type)
    if (!nextStatus) {
      await ctx.answerCbQuery('Это финальный статус.')
      return true
    }
    session.step = STEPS.ORDER_STATUS
    session.selectedOrderId = orderId
    session.selectedClientName = found.client_name
    session.nextStatus = nextStatus
    setSession(userId, session)
    await ctx.answerCbQuery()
    await ctx.editMessageText(
      `Заказ: ${found.client_name}\nТекущий статус: ${found.status}\nСледующий статус: ${nextStatus}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: `→ ${nextStatus}`, callback_data: 'no_nst' }],
            CANCEL_ROW,
          ],
        },
      }
    )
    return true
  }

  // ── Подтверждение смены статуса ──────────────────────────────────

  if (data === 'no_nst' && session.step === STEPS.ORDER_STATUS) {
    await ctx.answerCbQuery()
    try {
      await updateOrderStatus(session.selectedOrderId, session.nextStatus)
    } catch {
      await ctx.reply('Ошибка обновления статуса. Попробуй ещё раз.')
      return true
    }
    const clientName = session.selectedClientName
    const newStatus = session.nextStatus
    clearSession(userId)
    await ctx.editMessageText(`✅ Статус заказа ${clientName} обновлён: ${newStatus}`)
    return true
  }

  // ── Новый заказ: тип получения ───────────────────────────────────

  if (data.startsWith('no_dt_') && session.step === STEPS.DELIVERY_TYPE) {
    session.deliveryType = data.slice(6)
    await ctx.answerCbQuery()
    await ctx.editMessageText(`Тип получения: ${session.deliveryType}`)
    if (session.deliveryType === 'доставка') {
      session.step = STEPS.ADDRESS
      setSession(userId, session)
      await ctx.reply('Введи адрес доставки:', {
        reply_markup: { inline_keyboard: [CANCEL_ROW] },
      })
    } else {
      session.step = STEPS.READY_AT
      setSession(userId, session)
      await ctx.reply('Введи дату и время готовности (ДД.ММ.ГГГГ ЧЧ:ММ):', {
        reply_markup: { inline_keyboard: [CANCEL_ROW] },
      })
    }
    return true
  }

  // ── Выбор цветка ─────────────────────────────────────────────────

  if (data.startsWith('no_f_') && session.step === STEPS.FLOWER_SELECT) {
    const flowerId = data.slice(5)
    const flower = session.stock.find((f) => f.flower_id === flowerId)
    if (!flower) {
      await ctx.answerCbQuery('Цветок не найден.')
      return true
    }
    session.currentFlowerId = flowerId
    session.currentFlowerName = flower.name
    session.currentAvailable = flower.available
    session.step = STEPS.QUANTITY_INPUT
    setSession(userId, session)
    await ctx.answerCbQuery()
    await ctx.editMessageText(`Цветок: ${flower.name} (доступно: ${flower.available})`)
    await ctx.reply('Введи количество:', {
      reply_markup: { inline_keyboard: [CANCEL_ROW] },
    })
    return true
  }

  // ── Добавить ещё? ────────────────────────────────────────────────

  if (data === 'no_more_yes' && session.step === STEPS.MORE_FLOWERS) {
    session.step = STEPS.FLOWER_SELECT
    setSession(userId, session)
    await ctx.answerCbQuery()
    await ctx.editMessageText('Добавить ещё цветок? Да')
    await showFlowerSelect(ctx, session.stock)
    return true
  }

  if (data === 'no_more_no' && session.step === STEPS.MORE_FLOWERS) {
    session.step = STEPS.CONFIRM
    setSession(userId, session)
    await ctx.answerCbQuery()
    await ctx.editMessageText('Добавить ещё цветок? Нет')
    await showConfirm(ctx, session)
    return true
  }

  // ── Подтвердить новый заказ ──────────────────────────────────────

  if (data === 'no_confirm' && session.step === STEPS.CONFIRM) {
    await ctx.answerCbQuery()
    await ctx.editMessageText('⏳ Сохраняю заказ...')
    try {
      await saveOrder({
        clientName: session.clientName,
        clientPhone: session.clientPhone,
        deliveryType: session.deliveryType,
        address: session.address,
        readyAt: session.readyAtDate,
        items: session.items,
      })
    } catch {
      await ctx.reply('Ошибка сохранения заказа. Попробуй ещё раз.')
      return true
    }
    clearSession(userId)
    await ctx.editMessageText(`✅ Заказ создан!\n\n${formatSummary(session)}`, {
      parse_mode: 'Markdown',
    })
    return true
  }

  return false
}

async function handleText(ctx) {
  const userId = ctx.from.id
  const session = getSession(userId)
  if (!session) return false

  const text = ctx.message.text.trim()

  if (session.step === STEPS.CLIENT_NAME) {
    session.clientName = text
    session.step = STEPS.CLIENT_PHONE
    setSession(userId, session)
    await ctx.reply('Введи телефон клиента (или «—» если нет):', {
      reply_markup: { inline_keyboard: [CANCEL_ROW] },
    })
    return true
  }

  if (session.step === STEPS.CLIENT_PHONE) {
    session.clientPhone = text === '—' ? null : text
    session.step = STEPS.DELIVERY_TYPE
    setSession(userId, session)
    await showDeliveryType(ctx)
    return true
  }

  if (session.step === STEPS.ADDRESS) {
    session.address = text
    session.step = STEPS.READY_AT
    setSession(userId, session)
    await ctx.reply('Введи дату и время готовности (ДД.ММ.ГГГГ ЧЧ:ММ):', {
      reply_markup: { inline_keyboard: [CANCEL_ROW] },
    })
    return true
  }

  if (session.step === STEPS.READY_AT) {
    const isoDate = parseDate(text)
    if (!isoDate) {
      await ctx.reply('Неверный формат. Введи дату в виде ДД.ММ.ГГГГ ЧЧ:ММ:')
      return true
    }
    session.readyAt = text
    session.readyAtDate = isoDate
    session.step = STEPS.FLOWER_SELECT
    setSession(userId, session)

    let stock
    try {
      stock = await getFlowerStock()
    } catch {
      await ctx.reply('Ошибка загрузки остатков. Попробуй ещё раз.')
      return true
    }
    if (stock.length === 0) {
      await ctx.reply('Нет цветков в наличии. Сначала оформи поставку.')
      clearSession(userId)
      return true
    }
    session.stock = stock
    setSession(userId, session)
    await showFlowerSelect(ctx, stock)
    return true
  }

  if (session.step === STEPS.QUANTITY_INPUT) {
    if (!/^\d+$/.test(text) || parseInt(text, 10) <= 0) {
      await ctx.reply('Введи целое число больше нуля:')
      return true
    }
    const qty = parseInt(text, 10)
    if (qty > session.currentAvailable) {
      await ctx.reply(
        `Доступно только ${session.currentAvailable}. Введи другое количество:`
      )
      return true
    }
    session.items.push({
      flowerId: session.currentFlowerId,
      flowerName: session.currentFlowerName,
      quantity: qty,
    })
    const flower = session.stock.find((f) => f.flower_id === session.currentFlowerId)
    if (flower) flower.available -= qty

    session.currentFlowerId = null
    session.currentFlowerName = null
    session.currentAvailable = null
    session.step = STEPS.MORE_FLOWERS
    setSession(userId, session)
    await showMoreFlowers(ctx)
    return true
  }

  return false
}

module.exports = {
  startOrder,
  handleCallbackQuery,
  handleText,
  formatSummary,
  parseDate,
  getNextStatus,
  formatReadyAt,
}
