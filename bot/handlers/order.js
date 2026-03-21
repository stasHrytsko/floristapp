'use strict'

const { getFlowerStock, saveOrder } = require('../lib/supabase')

const STEPS = {
  CLIENT_NAME: 'CLIENT_NAME',
  CLIENT_PHONE: 'CLIENT_PHONE',
  DELIVERY_TYPE: 'DELIVERY_TYPE',
  ADDRESS: 'ADDRESS',
  READY_AT: 'READY_AT',
  FLOWER_SELECT: 'FLOWER_SELECT',
  QUANTITY_INPUT: 'QUANTITY_INPUT',
  MORE_FLOWERS: 'MORE_FLOWERS',
  CONFIRM: 'CONFIRM',
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
  setSession(userId, { step: STEPS.CLIENT_NAME, items: [], stock: [] })
  await ctx.reply('📋 *Новый заказ*\n\nВведи имя клиента:', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [CANCEL_ROW] },
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

  // Тип получения
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

  // Выбор цветка
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

  // Добавить ещё?
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

  // Подтвердить
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
    // Уменьшаем доступный остаток в кеше (оптимистично)
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

module.exports = { startOrder, handleCallbackQuery, handleText, formatSummary, parseDate }
