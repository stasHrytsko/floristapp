'use strict'

const { getSuppliers, createSupplier, getFlowers, saveDelivery } = require('../lib/supabase')
const { createSessionStore } = require('../lib/sessionStore')

// Состояния диалога
const STEPS = {
  SUPPLIER_SELECT: 'SUPPLIER_SELECT',
  NEW_SUPPLIER_NAME: 'NEW_SUPPLIER_NAME',
  NEW_SUPPLIER_PHONE: 'NEW_SUPPLIER_PHONE',
  FLOWER_SELECT: 'FLOWER_SELECT',
  QUANTITY_INPUT: 'QUANTITY_INPUT',
  MORE_FLOWERS: 'MORE_FLOWERS',
  CONFIRM: 'CONFIRM',
}

const { getSession, setSession, clearSession, isExpired } = createSessionStore()

function formatSummary(session) {
  const itemLines = session.items
    .map((i) => `• ${i.flowerName} — ${i.quantity} шт.`)
    .join('\n')
  return `📦 *Итог поставки*\n\nПоставщик: ${session.supplierName}\n\n${itemLines}`
}

async function startDelivery(ctx) {
  const userId = ctx.from.id
  clearSession(userId)

  let suppliers
  try {
    suppliers = await getSuppliers()
  } catch {
    return ctx.reply('Ошибка загрузки поставщиков. Попробуй ещё раз.')
  }

  setSession(userId, {
    step: STEPS.SUPPLIER_SELECT,
    supplierId: null,
    supplierName: null,
    items: [],
    currentFlowerId: null,
    currentFlowerName: null,
    suppliers,
  })

  await showSupplierSelect(ctx, suppliers)
}

async function showSupplierSelect(ctx, suppliers) {
  const buttons = suppliers.map((s) => [
    { text: s.name, callback_data: `sup:${s.id}` },
  ])
  buttons.push([{ text: '+ Новый поставщик', callback_data: 'sup:new' }])
  buttons.push([{ text: '❌ Отмена', callback_data: 'delivery:cancel' }])

  await ctx.reply('Выбери поставщика:', {
    reply_markup: { inline_keyboard: buttons },
  })
}

async function showFlowerSelect(ctx, flowers) {
  const buttons = flowers.map((f) => [
    { text: f.name, callback_data: `flower:${f.id}` },
  ])
  buttons.push([{ text: '❌ Отмена', callback_data: 'delivery:cancel' }])

  await ctx.reply('Выбери цветок:', {
    reply_markup: { inline_keyboard: buttons },
  })
}

// Обработчик callback_query для диалога поставки
async function handleCallbackQuery(ctx) {
  const userId = ctx.from.id
  const data = ctx.callbackQuery.data
  const session = getSession(userId)

  // Отмена на любом шаге
  if (data === 'delivery:cancel') {
    clearSession(userId)
    await ctx.answerCbQuery()
    await ctx.editMessageText('❌ Поставка отменена.')
    return
  }

  if (!session) {
    await ctx.answerCbQuery('Сессия истекла. Начни заново через меню.')
    return
  }

  if (session.step === STEPS.SUPPLIER_SELECT) {
    if (data === 'sup:new') {
      session.step = STEPS.NEW_SUPPLIER_NAME
      setSession(userId, session)
      await ctx.answerCbQuery()
      await ctx.editMessageText('Введи название нового поставщика:')
      return
    }

    if (data.startsWith('sup:')) {
      const id = data.slice(4)
      const supplier = session.suppliers.find((s) => String(s.id) === id)
      session.supplierId = id
      session.supplierName = supplier ? supplier.name : id
      session.step = STEPS.FLOWER_SELECT

      let flowers
      try {
        flowers = await getFlowers()
      } catch {
        await ctx.answerCbQuery()
        await ctx.reply('Ошибка загрузки цветов. Попробуй ещё раз.')
        return
      }
      session.flowers = flowers
      setSession(userId, session)

      await ctx.answerCbQuery()
      await ctx.editMessageText(`Поставщик: ${session.supplierName}`)
      await showFlowerSelect(ctx, flowers)
      return
    }
  }

  if (session.step === STEPS.FLOWER_SELECT && data.startsWith('flower:')) {
    const id = data.slice(7)
    const flower = session.flowers.find((f) => String(f.id) === id)
    session.currentFlowerId = id
    session.currentFlowerName = flower ? flower.name : id
    session.step = STEPS.QUANTITY_INPUT
    setSession(userId, session)

    await ctx.answerCbQuery()
    await ctx.editMessageText(
      `Цветок: *${session.currentFlowerName}*\n\nВведи количество (штук):`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  if (session.step === STEPS.MORE_FLOWERS) {
    if (data === 'more:yes') {
      session.step = STEPS.FLOWER_SELECT
      setSession(userId, session)

      await ctx.answerCbQuery()
      await ctx.editMessageText('Добавляем ещё цветок.')
      await showFlowerSelect(ctx, session.flowers)
      return
    }

    if (data === 'more:no') {
      session.step = STEPS.CONFIRM
      setSession(userId, session)

      await ctx.answerCbQuery()
      await ctx.editMessageText(formatSummary(session), {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Подтвердить', callback_data: 'confirm:yes' },
              { text: '❌ Отменить', callback_data: 'delivery:cancel' },
            ],
          ],
        },
      })
      return
    }
  }

  if (session.step === STEPS.CONFIRM && data === 'confirm:yes') {
    await ctx.answerCbQuery()
    await ctx.editMessageText('Сохраняю поставку...')

    try {
      await saveDelivery({
        supplierId: session.supplierId,
        items: session.items,
        deliveredAt: new Date().toISOString().slice(0, 10),
      })
    } catch (err) {
      clearSession(userId)
      await ctx.reply(`Ошибка сохранения: ${err.message}`)
      return
    }

    clearSession(userId)
    await ctx.editMessageText('✅ Поставка принята! Остатки обновлены.')
    return
  }

  await ctx.answerCbQuery()
}

// Обработчик текстовых сообщений в диалоге
async function handleText(ctx) {
  const userId = ctx.from.id
  const session = getSession(userId)

  if (!session) {
    if (isExpired(userId)) {
      clearSession(userId)
      await ctx.reply('Сессия истекла. Начни заново через меню.')
      return true
    }
    return false
  }

  const text = ctx.message.text.trim()

  if (session.step === STEPS.NEW_SUPPLIER_NAME) {
    session.newSupplierName = text
    session.step = STEPS.NEW_SUPPLIER_PHONE
    setSession(userId, session)
    await ctx.reply('Введи номер телефона поставщика (или «-» если нет):')
    return true
  }

  if (session.step === STEPS.NEW_SUPPLIER_PHONE) {
    const phone = text === '-' ? null : text
    let supplier
    try {
      supplier = await createSupplier(session.newSupplierName, phone)
    } catch (err) {
      await ctx.reply(`Ошибка создания поставщика: ${err.message}`)
      return true
    }

    session.supplierId = supplier.id
    session.supplierName = supplier.name
    session.suppliers.push(supplier)
    session.step = STEPS.FLOWER_SELECT

    let flowers
    try {
      flowers = await getFlowers()
    } catch {
      await ctx.reply('Ошибка загрузки цветов. Попробуй ещё раз.')
      return true
    }
    session.flowers = flowers
    setSession(userId, session)

    await ctx.reply(`✅ Поставщик «${supplier.name}» создан.`)
    await showFlowerSelect(ctx, flowers)
    return true
  }

  if (session.step === STEPS.QUANTITY_INPUT) {
    const qty = parseInt(text, 10)
    if (isNaN(qty) || qty <= 0) {
      await ctx.reply('Введи целое положительное число:')
      return true
    }

    session.items.push({
      flowerId: session.currentFlowerId,
      flowerName: session.currentFlowerName,
      quantity: qty,
    })
    session.currentFlowerId = null
    session.currentFlowerName = null
    session.step = STEPS.MORE_FLOWERS
    setSession(userId, session)

    await ctx.reply('Добавить ещё цветок?', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Да', callback_data: 'more:yes' },
            { text: 'Нет', callback_data: 'more:no' },
          ],
          [{ text: '❌ Отмена', callback_data: 'delivery:cancel' }],
        ],
      },
    })
    return true
  }

  return false // текст не для нашего диалога
}

module.exports = { startDelivery, handleCallbackQuery, handleText, STEPS, getSession, clearSession }
