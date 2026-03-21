'use strict'

const { getAllStock, getLowStock, searchFlowers, getFlowerStockById } = require('../lib/supabase')

const STEPS = {
  MENU: 'MENU',
  SEARCH_INPUT: 'SEARCH_INPUT',
  SEARCH_SELECT: 'SEARCH_SELECT',
}

const sessions = new Map()

function getSession(userId) {
  return sessions.get(userId)
}
function setSession(userId, s) {
  sessions.set(userId, s)
}
function clearSession(userId) {
  sessions.delete(userId)
}

const CANCEL_ROW = [{ text: '❌ Отмена', callback_data: 'st_cancel' }]

async function startStock(ctx) {
  const userId = ctx.from.id
  setSession(userId, { step: STEPS.MENU })
  await ctx.reply('🌸 Остатки:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📋 Все остатки', callback_data: 'st_all' },
          { text: '⚠️ Заканчивается', callback_data: 'st_low' },
        ],
        [{ text: '🔍 Найти цветок', callback_data: 'st_search' }],
        CANCEL_ROW,
      ],
    },
  })
}

function formatAllStock(stock) {
  if (stock.length === 0) return 'Нет данных об остатках.'
  const lines = ['🌸 Все остатки:\n']
  for (const f of stock) {
    lines.push(`• ${f.name} — ${f.available} свободно, ${f.reserved} зарезервировано`)
  }
  return lines.join('\n')
}

function formatLowStock(stock) {
  if (stock.length === 0) return '✅ Все цветки в достаточном количестве.'
  const lines = ['⚠️ Заканчивается:\n']
  for (const f of stock) {
    lines.push(`• ${f.name} — ${f.available} свободно`)
  }
  return lines.join('\n')
}

function formatFlowerDetail(f) {
  return [
    `🌸 ${f.name}`,
    `Всего: ${f.total}`,
    `Зарезервировано: ${f.reserved}`,
    `Свободно: ${f.available}`,
  ].join('\n')
}

async function handleCallbackQuery(ctx) {
  const data = ctx.callbackQuery.data
  if (!data.startsWith('st_')) return false

  const userId = ctx.from.id

  if (data === 'st_cancel') {
    clearSession(userId)
    await ctx.answerCbQuery()
    await ctx.editMessageText('❌ Отменено.')
    return true
  }

  const session = getSession(userId)
  if (!session) {
    await ctx.answerCbQuery('Сессия истекла. Начни заново через меню.')
    return true
  }

  if (data === 'st_all' && session.step === STEPS.MENU) {
    let stock
    try {
      stock = await getAllStock()
    } catch {
      await ctx.answerCbQuery()
      await ctx.reply('Ошибка загрузки остатков. Попробуй ещё раз.')
      return true
    }
    clearSession(userId)
    await ctx.answerCbQuery()
    await ctx.editMessageText(formatAllStock(stock))
    return true
  }

  if (data === 'st_low' && session.step === STEPS.MENU) {
    let stock
    try {
      stock = await getLowStock()
    } catch {
      await ctx.answerCbQuery()
      await ctx.reply('Ошибка загрузки остатков. Попробуй ещё раз.')
      return true
    }
    clearSession(userId)
    await ctx.answerCbQuery()
    await ctx.editMessageText(formatLowStock(stock))
    return true
  }

  if (data === 'st_search' && session.step === STEPS.MENU) {
    session.step = STEPS.SEARCH_INPUT
    setSession(userId, session)
    await ctx.answerCbQuery()
    await ctx.editMessageText('🔍 Поиск цветка')
    await ctx.reply('Введи первые буквы названия:', {
      reply_markup: { inline_keyboard: [CANCEL_ROW] },
    })
    return true
  }

  if (data.startsWith('st_fl_') && session.step === STEPS.SEARCH_SELECT) {
    const flowerId = data.slice(6)
    let flower
    try {
      flower = await getFlowerStockById(flowerId)
    } catch {
      await ctx.answerCbQuery()
      await ctx.reply('Ошибка загрузки данных. Попробуй ещё раз.')
      return true
    }
    clearSession(userId)
    await ctx.answerCbQuery()
    await ctx.editMessageText(formatFlowerDetail(flower))
    return true
  }

  return false
}

async function handleText(ctx) {
  const userId = ctx.from.id
  const session = getSession(userId)
  if (!session) return false

  if (session.step === STEPS.SEARCH_INPUT) {
    const query = ctx.message.text.trim()
    if (!query) {
      await ctx.reply('Введи хотя бы одну букву:')
      return true
    }

    let results
    try {
      results = await searchFlowers(query)
    } catch {
      await ctx.reply('Ошибка поиска. Попробуй ещё раз.')
      return true
    }

    if (results.length === 0) {
      await ctx.reply('Ничего не найдено, попробуй ещё раз:')
      return true
    }

    session.step = STEPS.SEARCH_SELECT
    setSession(userId, session)
    const buttons = results.map((f) => [
      { text: `${f.name} (${f.available})`, callback_data: `st_fl_${f.flower_id}` },
    ])
    buttons.push(CANCEL_ROW)
    await ctx.reply('Выбери цветок:', {
      reply_markup: { inline_keyboard: buttons },
    })
    return true
  }

  return false
}

module.exports = {
  startStock,
  handleCallbackQuery,
  handleText,
  formatAllStock,
  formatLowStock,
  formatFlowerDetail,
}
