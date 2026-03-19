'use strict'

require('dotenv').config()

const { Telegraf } = require('telegraf')
const express = require('express')

const BOT_TOKEN = process.env.BOT_TOKEN
const ALLOWED_ID = Number(process.env.ALLOWED_TELEGRAM_ID)
const WEBHOOK_URL = process.env.WEBHOOK_URL
const PORT = process.env.PORT || 3000

if (!BOT_TOKEN) throw new Error('BOT_TOKEN не задан в .env')
if (!ALLOWED_ID) throw new Error('ALLOWED_TELEGRAM_ID не задан в .env')

const bot = new Telegraf(BOT_TOKEN)

// Whitelist middleware — проверяет каждый входящий апдейт
bot.use((ctx, next) => {
  const userId = ctx.from?.id
  if (userId !== ALLOWED_ID) {
    return ctx.reply('Нет доступа.')
  }
  return next()
})

bot.start((ctx) => {
  ctx.reply(
    'Привет! Я бот FloristApp.\n\nДоступные команды:\n/start — это сообщение'
  )
})

bot.help((ctx) => {
  ctx.reply('Доступные команды:\n/start — приветствие')
})

// Неизвестные команды
bot.on('text', (ctx) => {
  ctx.reply('Неизвестная команда. Напиши /start чтобы начать.')
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
