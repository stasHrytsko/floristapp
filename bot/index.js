'use strict'

require('dotenv').config()

const { Telegraf } = require('telegraf')
const express = require('express')
const delivery = require('./handlers/delivery')
const writeoff = require('./handlers/writeoff')
const order = require('./handlers/order')
const stock = require('./handlers/stock')

const BOT_TOKEN = process.env.BOT_TOKEN
const WEBHOOK_URL = process.env.WEBHOOK_URL
const PORT = process.env.PORT || 3000

if (!BOT_TOKEN) throw new Error('BOT_TOKEN не задан в .env')

const bot = new Telegraf(BOT_TOKEN)

const MAIN_MENU = {
  reply_markup: {
    keyboard: [
      ['📦 Поставка', '🗑 Списание'],
      ['📋 Заказы', '🌸 Остатки'],
    ],
    resize_keyboard: true,
    persistent: true,
  },
}

bot.start((ctx) => {
  ctx.reply('Привет! Выбери действие:', MAIN_MENU)
})

bot.help((ctx) => {
  ctx.reply('Выбери действие из меню ниже.', MAIN_MENU)
})

// Кнопки главного меню
bot.hears('📦 Поставка', (ctx) => delivery.startDelivery(ctx))
bot.hears('🗑 Списание', (ctx) => writeoff.startWriteOff(ctx))

bot.hears('📋 Заказы', (ctx) => order.startOrder(ctx))

bot.hears('🌸 Остатки', (ctx) => stock.startStock(ctx))

// Callback-кнопки (inline keyboard) — роутинг по префиксу
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data
  if (data.startsWith('wo_')) {
    await writeoff.handleCallbackQuery(ctx)
  } else if (data.startsWith('no_')) {
    await order.handleCallbackQuery(ctx)
  } else if (data.startsWith('st_')) {
    await stock.handleCallbackQuery(ctx)
  } else {
    await delivery.handleCallbackQuery(ctx)
  }
})

// Текстовые сообщения — сначала пробуем активные диалоги, иначе подсказка
bot.on('text', async (ctx) => {
  const handled =
    (await writeoff.handleText(ctx)) ||
    (await order.handleText(ctx)) ||
    (await stock.handleText(ctx)) ||
    (await delivery.handleText(ctx))
  if (!handled) {
    ctx.reply('Используй кнопки меню ниже.', MAIN_MENU)
  }
})

async function launch() {
  if (WEBHOOK_URL) {
    // Webhook режим (production)
    const app = express()
    app.use(express.json())

    const webhookPath = `/webhook/${BOT_TOKEN}`
    app.use(bot.webhookCallback(webhookPath))

    app.get('/health', (_req, res) => res.json({ ok: true }))

    await bot.telegram.setWebhook(`${WEBHOOK_URL}${webhookPath}`)

    app.listen(PORT, () => {
      console.log(`Бот запущен на порту ${PORT} (webhook)`)
    })
  } else {
    // Long polling режим (локально)
    await bot.launch()
    console.log('Бот запущен (long polling)')
  }
}

launch().catch((err) => {
  console.error('Ошибка запуска бота:', err)
  process.exit(1)
})

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

module.exports = { bot }
