'use strict'

const TTL_MS = 10 * 60 * 1000 // 10 минут

/**
 * Создаёт хранилище сессий с автоматическим TTL.
 * При каждом setSession таймер сбрасывается.
 * По истечении TTL сессия помечается как истёкшая — isExpired() вернёт true.
 */
function createSessionStore(ttlMs = TTL_MS) {
  const sessions = new Map()
  const timers = new Map()

  function getSession(userId) {
    const s = sessions.get(userId)
    return s && !s.__expired ? s : undefined
  }

  function isExpired(userId) {
    const s = sessions.get(userId)
    return !!(s && s.__expired)
  }

  function setSession(userId, data) {
    if (timers.has(userId)) clearTimeout(timers.get(userId))
    sessions.set(userId, data)
    const t = setTimeout(() => {
      sessions.set(userId, { __expired: true })
      timers.delete(userId)
    }, ttlMs)
    timers.set(userId, t)
  }

  function clearSession(userId) {
    if (timers.has(userId)) {
      clearTimeout(timers.get(userId))
      timers.delete(userId)
    }
    sessions.delete(userId)
  }

  return { getSession, setSession, clearSession, isExpired }
}

module.exports = { createSessionStore }
