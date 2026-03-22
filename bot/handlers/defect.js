'use strict'

const { getSuppliers, getFlowersBySupplier, saveDefect } = require('../lib/supabase')
const { createSessionStore } = require('../lib/sessionStore')

const STEPS = {
  SUPPLIER_SELECT: 'SUPPLIER_SELECT',
  FLOWER_SELECT: 'FLOWER_SELECT',
  QUANTITY_INPUT: 'QUANTITY_INPUT',
  TYPE_SELECT: 'TYPE_SELECT',
  CONFIRM: 'CONFIRM',
}

const { getSession, setSession, clearSession, isExpired } = createSessionStore()

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

async function showSupplierSelect(ctx, suppliers) {
  const buttons = suppliers.map((s) => [
    { text: s.name, callback_data: `ds_s_${s.id}` },
  ])
  buttons.push([{ text: '❌ Отмена', callback_data: 'ds_cancel' }])
  await ctx.reply('Выбери поставщика:', {
    reply_markup: { inline_keyboard: buttons },
  })
}

async function showFlowerSelect(ctx, flowers) {
  const buttons = flowers.map((f) => [
    { text: f.name, callback_data: `ds_f_${f.id}` },
  ])
  buttons.push([{ text: '❌ Отмена', callback_data: 'ds_cancel' }])
  await ctx.reply('Выбери цветок:', {
    reply_markup: { inline_keyboard: buttons },
  })
}

async function startDefect(ctx) {
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
    flowerId: null,
    flowerName: null,
    quantity: null,
    defectType: null,
    suppliers,
    flowers: [],
  })

  await showSupplierSelect(ctx, suppliers)
}

// Возвращает true если обработал, false — не наш callback
async function handleCallbackQuery(ctx) {
  const data = ctx.callbackQuery.data
  if (!data.startsWith('ds_')) return false

  const userId = ctx.from.id

  if (data === 'ds_cancel') {
    clearSession(userId)
    await ctx.answerCbQuery()
    await ctx.editMessageText('❌ Брак отменён.')
    return true
  }

  const session = getSession(userId)
  if (!session) {
    await ctx.answerCbQuery('Сессия истекла. Начни заново через меню.')
    return true
  }

  if (session.step === STEPS.SUPPLIER_SELECT && data.startsWith('ds_s_')) {
    const id = data.slice(5)
    const supplier = session.suppliers.find((s) => String(s.id) === id)
    session.supplierId = id
    session.supplierName = supplier ? supplier.name : id
    session.step = STEPS.FLOWER_SELECT

    let flowers
    try {
      flowers = await getFlowersBySupplier(id)
    } catch {
      await ctx.answerCbQuery()
      await ctx.reply('Ошибка загрузки цветов. Попробуй ещё раз.')
      return true
    }
    if (flowers.length === 0) {
      await ctx.answerCbQuery()
      await ctx.reply('У этого поставщика нет активных партий. Выбери другого.')
      clearSession(userId)
      return true
    }
    session.flowers = flowers
    setSession(userId, session)

    await ctx.answerCbQuery()
    await ctx.editMessageText(`Поставщик: ${session.supplierName}`)
    await showFlowerSelect(ctx, flowers)
    return true
  }

  if (session.step === STEPS.FLOWER_SELECT && data.startsWith('ds_f_')) {
    const id = data.slice(5)
    const flower = session.flowers.find((f) => String(f.id) === id)
    session.flowerId = id
    session.flowerName = flower ? flower.name : id
    session.step = STEPS.QUANTITY_INPUT
    setSession(userId, session)

    await ctx.answerCbQuery()
    await ctx.editMessageText(
      `Цветок: *${session.flowerName}*\n\nВведи количество бракованных (штук):`,
      { parse_mode: 'Markdown' }
    )
    return true
  }

  if (session.step === STEPS.TYPE_SELECT) {
    if (data === 'ds_t_rot') session.defectType = 'гнилой'
    else if (data === 'ds_t_col') session.defectType = 'не тот цвет'
    else { await ctx.answerCbQuery(); return true }

    session.step = STEPS.CONFIRM
    setSession(userId, session)

    await ctx.answerCbQuery()
    await ctx.editMessageText(formatSummary(session), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Подтвердить', callback_data: 'ds_yes' },
            { text: '❌ Отменить', callback_data: 'ds_cancel' },
          ],
        ],
      },
    })
    return true
  }

  if (session.step === STEPS.CONFIRM && data === 'ds_yes') {
    await ctx.answerCbQuery()
    await ctx.editMessageText('Сохраняю...')

    try {
      await saveDefect({
        supplierId: session.supplierId,
        flowerId: session.flowerId,
        quantity: session.quantity,
        defectType: session.defectType,
      })
    } catch (err) {
      clearSession(userId)
      await ctx.reply(`Ошибка сохранения: ${err.message}`)
      return true
    }

    clearSession(userId)
    const msg = session.defectType === 'гнилой'
      ? '✅ Брак зафиксирован. Остаток уменьшен, движение «списание» записано.'
      : '✅ Брак зафиксирован. Остаток не изменён, запись с пометкой добавлена.'
    await ctx.editMessageText(msg)
    return true
  }

  await ctx.answerCbQuery()
  return true
}

// Обрабатывает ввод количества; возвращает true если обработал
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

    session.quantity = qty
    session.step = STEPS.TYPE_SELECT
    setSession(userId, session)

    await ctx.reply('Тип брака:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🗑 Гнилые', callback_data: 'ds_t_rot' },
            { text: '🎨 Не тот цвет', callback_data: 'ds_t_col' },
          ],
          [{ text: '❌ Отмена', callback_data: 'ds_cancel' }],
        ],
      },
    })
    return true
  }

  return false
}

module.exports = { startDefect, handleCallbackQuery, handleText, STEPS, getSession, clearSession }
