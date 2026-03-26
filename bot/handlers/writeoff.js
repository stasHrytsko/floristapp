'use strict'

const { getFlowerStock, saveWriteOff } = require('../lib/supabase')
const { createSessionStore } = require('../lib/sessionStore')

const STEPS = {
  FLOWER_SELECT: 'FLOWER_SELECT',
  QUANTITY_INPUT: 'QUANTITY_INPUT',
  CONFIRM: 'CONFIRM',
}

const { getSession, setSession, clearSession, isExpired } = createSessionStore()

const CANCEL_ROW = [{ text: '❌ Отмена', callback_data: 'wo_cancel' }]

async function startWriteOff(ctx) {
  const userId = ctx.from.id
  clearSession(userId)

  let stock
  try {
    stock = await getFlowerStock()
  } catch {
    return ctx.reply('Ошибка загрузки остатков. Попробуй ещё раз.')
  }

  if (stock.length === 0) {
    return ctx.reply('Нет цветков в наличии для списания.')
  }

  setSession(userId, {
    step: STEPS.FLOWER_SELECT,
    stock,
    flowerId: null,
    flowerName: null,
    flowerAvailable: null,
    quantity: null,
  })

  const buttons = stock.map((f) => [
    { text: `${f.name} (${f.available})`, callback_data: `wo_f_${f.flower_id}` },
  ])
  buttons.push(CANCEL_ROW)
  await ctx.reply('🗑 Списание — выбери цветок:', {
    reply_markup: { inline_keyboard: buttons },
  })
}

async function handleCallbackQuery(ctx) {
  const data = ctx.callbackQuery.data
  if (!data.startsWith('wo_')) return false

  const userId = ctx.from.id

  if (data === 'wo_cancel') {
    clearSession(userId)
    await ctx.answerCbQuery()
    await ctx.editMessageText('❌ Списание отменено.')
    return true
  }

  const session = getSession(userId)
  if (!session) {
    await ctx.answerCbQuery('Сессия истекла. Начни заново через меню.')
    return true
  }

  if (session.step === STEPS.FLOWER_SELECT && data.startsWith('wo_f_')) {
    const flowerId = data.slice(5)
    const flower = session.stock.find((f) => f.flower_id === flowerId)
    if (!flower) {
      await ctx.answerCbQuery('Цветок не найден.')
      return true
    }
    session.flowerId = flowerId
    session.flowerName = flower.name
    session.flowerAvailable = flower.available
    session.step = STEPS.QUANTITY_INPUT
    setSession(userId, session)
    await ctx.answerCbQuery()
    await ctx.editMessageText(
      `Цветок: ${flower.name} (доступно: ${flower.available})\n\nВведи количество для списания:`
    )
    return true
  }

  if (session.step === STEPS.CONFIRM && data === 'wo_yes') {
    await ctx.answerCbQuery()
    await ctx.editMessageText('Сохраняю...')
    try {
      await saveWriteOff(session.flowerId, session.quantity)
    } catch (err) {
      clearSession(userId)
      await ctx.reply(`Ошибка сохранения: ${err.message}`)
      return true
    }
    clearSession(userId)
    await ctx.editMessageText(`✅ Списано: ${session.flowerName} — ${session.quantity} шт.`)
    return true
  }

  await ctx.answerCbQuery()
  return true
}

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

  if (session.step === STEPS.QUANTITY_INPUT) {
    const qty = parseInt(ctx.message.text.trim(), 10)
    if (isNaN(qty) || qty <= 0) {
      await ctx.reply('Введи целое положительное число:')
      return true
    }
    if (qty > session.flowerAvailable) {
      await ctx.reply(`Доступно только ${session.flowerAvailable}. Введи другое количество:`)
      return true
    }
    session.quantity = qty
    session.step = STEPS.CONFIRM
    setSession(userId, session)
    await ctx.reply(
      `🗑 *Списание — подтверждение*\n\nЦветок: ${session.flowerName}\nКоличество: ${qty} шт.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Подтвердить', callback_data: 'wo_yes' },
              { text: '❌ Отменить', callback_data: 'wo_cancel' },
            ],
          ],
        },
      }
    )
    return true
  }

  return false
}

module.exports = { startWriteOff, handleCallbackQuery, handleText }
