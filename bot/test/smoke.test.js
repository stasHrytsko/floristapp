'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

// Тестируем логику whitelist напрямую, без запуска бота
const ALLOWED_ID = 123456

function isAllowed(ctx) {
  return ctx.from?.id === ALLOWED_ID
}

async function whitelistMiddleware(ctx, next) {
  if (!isAllowed(ctx)) {
    await ctx.reply('Нет доступа.')
    return
  }
  return next()
}

function makeCtx(userId) {
  const replies = []
  return {
    from: userId != null ? { id: userId } : undefined,
    reply: (msg) => { replies.push(msg); return Promise.resolve() },
    getReplies: () => replies,
  }
}

describe('whitelist middleware', () => {
  it('пропускает авторизованного пользователя', async () => {
    const ctx = makeCtx(ALLOWED_ID)
    let nextCalled = false
    await whitelistMiddleware(ctx, () => { nextCalled = true })
    assert.equal(nextCalled, true)
    assert.equal(ctx.getReplies().length, 0)
  })

  it('блокирует неавторизованного пользователя', async () => {
    const ctx = makeCtx(999999)
    let nextCalled = false
    await whitelistMiddleware(ctx, () => { nextCalled = true })
    assert.equal(nextCalled, false)
    assert.equal(ctx.getReplies()[0], 'Нет доступа.')
  })

  it('блокирует апдейт без from', async () => {
    const ctx = makeCtx(null)
    let nextCalled = false
    await whitelistMiddleware(ctx, () => { nextCalled = true })
    assert.equal(nextCalled, false)
    assert.equal(ctx.getReplies()[0], 'Нет доступа.')
  })
})
