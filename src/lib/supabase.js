// MOCK — замість Supabase. Дані зберігаються в localStorage.
// Щоб скинути до початкових даних: window.resetFloristDb() в консолі браузера.

const DB_KEY = 'floristapp_db'
const NOW = '2026-03-25T10:00:00Z'

const SEED = {
  flowers: [
    { id: 'fl1', name: 'Роза', created_at: NOW },
    { id: 'fl2', name: 'Тюльпан', created_at: NOW },
    { id: 'fl3', name: 'Хризантема', created_at: NOW },
    { id: 'fl4', name: 'Лілія', created_at: NOW },
  ],
  suppliers: [
    { id: 'sup1', name: 'Флор Оптовик', phone: '+380991234567', created_at: NOW },
    { id: 'sup2', name: 'Квіти Миру', phone: '+380997654321', created_at: NOW },
  ],
  deliveries: [
    { id: 'del1', supplier_id: 'sup1', delivered_at: '2026-03-25', created_at: NOW },
  ],
  batches: [
    { id: 'bat1', supplier_id: 'sup1', flower_id: 'fl1', quantity: 50, delivered_at: '2026-03-25' },
    { id: 'bat2', supplier_id: 'sup1', flower_id: 'fl2', quantity: 30, delivered_at: '2026-03-25' },
    { id: 'bat3', supplier_id: 'sup1', flower_id: 'fl3', quantity: 20, delivered_at: '2026-03-25' },
    { id: 'bat4', supplier_id: 'sup1', flower_id: 'fl4', quantity: 15, delivered_at: '2026-03-25' },
  ],
  delivery_items: [
    { id: 'di1', delivery_id: 'del1', flower_id: 'fl1', quantity: 50, batch_id: 'bat1', reception_status: 'ok', defect_qty: null, comment: null },
    { id: 'di2', delivery_id: 'del1', flower_id: 'fl2', quantity: 30, batch_id: 'bat2', reception_status: 'ok', defect_qty: null, comment: null },
    { id: 'di3', delivery_id: 'del1', flower_id: 'fl3', quantity: 20, batch_id: 'bat3', reception_status: 'ok', defect_qty: null, comment: null },
    { id: 'di4', delivery_id: 'del1', flower_id: 'fl4', quantity: 15, batch_id: 'bat4', reception_status: 'ok', defect_qty: null, comment: null },
  ],
  movements: [
    { id: 'mov1', flower_id: 'fl1', batch_id: 'bat1', order_id: null, defect_id: null, movement_type: 'поставка', quantity: 50, created_at: NOW },
    { id: 'mov2', flower_id: 'fl2', batch_id: 'bat2', order_id: null, defect_id: null, movement_type: 'поставка', quantity: 30, created_at: NOW },
    { id: 'mov3', flower_id: 'fl3', batch_id: 'bat3', order_id: null, defect_id: null, movement_type: 'поставка', quantity: 20, created_at: NOW },
    { id: 'mov4', flower_id: 'fl4', batch_id: 'bat4', order_id: null, defect_id: null, movement_type: 'поставка', quantity: 15, created_at: NOW },
  ],
  orders: [],
  order_items: [],
  defects: [],
  clients: [
    { id: 'cl1', name: 'Марина Коваль', phone: '+380501234567', created_at: NOW },
  ],
}

// Відношення між таблицями для nested select
const RELATIONS = {
  deliveries: {
    suppliers: { table: 'suppliers', localKey: 'supplier_id', foreignKey: 'id', type: 'one' },
    delivery_items: { table: 'delivery_items', localKey: 'id', foreignKey: 'delivery_id', type: 'many' },
  },
  delivery_items: {
    flowers: { table: 'flowers', localKey: 'flower_id', foreignKey: 'id', type: 'one' },
    batches: { table: 'batches', localKey: 'batch_id', foreignKey: 'id', type: 'one' },
  },
  batches: {
    suppliers: { table: 'suppliers', localKey: 'supplier_id', foreignKey: 'id', type: 'one' },
    flowers: { table: 'flowers', localKey: 'flower_id', foreignKey: 'id', type: 'one' },
  },
  movements: {
    flowers: { table: 'flowers', localKey: 'flower_id', foreignKey: 'id', type: 'one' },
  },
  orders: {
    order_items: { table: 'order_items', localKey: 'id', foreignKey: 'order_id', type: 'many' },
  },
  order_items: {
    flowers: { table: 'flowers', localKey: 'flower_id', foreignKey: 'id', type: 'one' },
  },
}

function loadDb() {
  try {
    const stored = localStorage.getItem(DB_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  const db = JSON.parse(JSON.stringify(SEED))
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  return db
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Обчислює view flower_stock з таблиці movements (виправлена формула)
function computeFlowerStock(db) {
  return (db.flowers || []).map((f) => {
    const movs = (db.movements || []).filter((m) => m.flower_id === f.id)
    const sum = (type) => movs.filter((m) => m.movement_type === type).reduce((s, m) => s + m.quantity, 0)
    const delivered = sum('поставка')
    const sold = sum('выдача')
    const reservedRaw = sum('резерв')
    const cancelReserve = sum('отмена_резерва')
    const writeoff = sum('списание')
    const reserved = Math.max(0, reservedRaw - sold - cancelReserve)
    // available = поставка - списание - резерв_raw + скасовані (виправлена формула)
    const available = delivered - writeoff - reservedRaw + cancelReserve
    return { flower_id: f.id, name: f.name, total: delivered, sold, reserved, available }
  })
}

// Парсить рядок select типу "id, name, suppliers ( name ), items ( id, flowers ( name ) )"
function parseSelectCols(colStr) {
  const fields = []
  const relations = []
  let depth = 0, current = '', relName = '', relContent = ''
  for (let i = 0; i <= colStr.length; i++) {
    const ch = i < colStr.length ? colStr[i] : ','
    if (ch === '(') {
      if (++depth === 1) { relName = current.trim(); current = ''; relContent = '' }
      else relContent += ch
    } else if (ch === ')') {
      if (--depth === 0) { relations.push({ name: relName, colStr: relContent.trim() }); relName = ''; relContent = ''; current = '' }
      else relContent += ch
    } else if (ch === ',' && depth === 0) {
      const f = current.trim()
      if (f) fields.push(f)
      current = ''
    } else if (depth > 0) {
      relContent += ch
    } else {
      current += ch
    }
  }
  return { fields, relations }
}

function projectRow(row, fields, includeAll) {
  if (includeAll) return { ...row }
  const obj = {}
  for (const f of fields) obj[f] = row[f]
  return obj
}

function resolveRelations(rows, table, relDefs, db) {
  if (!relDefs.length) return rows
  const tableRels = RELATIONS[table] || {}
  return rows.map((row) => {
    const result = { ...row }
    for (const rel of relDefs) {
      const relInfo = tableRels[rel.name]
      if (!relInfo) continue
      const all = db[relInfo.table] || []
      const matched = relInfo.type === 'many'
        ? all.filter((r) => r[relInfo.foreignKey] === row[relInfo.localKey])
        : all.filter((r) => r[relInfo.foreignKey] === row[relInfo.localKey]).slice(0, 1)
      const { fields: rFields, relations: rRels } = parseSelectCols(rel.colStr || '*')
      const includeAll = !rel.colStr || rel.colStr === '*' || rFields.length === 0
      // Разрешаем вложенные связи на полных строках, потом проецируем поля + имена связей
      const resolved = resolveRelations(matched, relInfo.table, rRels, db)
      const rAllFields = [...rFields, ...rRels.map((r) => r.name)]
      const projected = resolved.map((r) => projectRow(r, rAllFields, includeAll))
      result[rel.name] = relInfo.type === 'many' ? projected : (projected[0] ?? null)
    }
    return result
  })
}

class QueryBuilder {
  constructor(table) {
    this._table = table
    this._op = 'select'
    this._selectStr = '*'
    this._filters = []
    this._orderField = null
    this._orderAsc = true
    this._limitN = null
    this._insertData = null
    this._updateData = null
    this._isSingle = false
  }

  select(cols) {
    this._selectStr = cols || '*'
    if (this._op !== 'insert' && this._op !== 'update') this._op = 'select'
    return this
  }
  insert(data) { this._op = 'insert'; this._insertData = data; return this }
  update(data) { this._op = 'update'; this._updateData = data; return this }
  delete() { this._op = 'delete'; return this }
  eq(field, value) { this._filters.push({ type: 'eq', field, value }); return this }
  in(field, values) { this._filters.push({ type: 'in', field, values }); return this }
  is(field, value) { this._filters.push({ type: 'is', field, value }); return this }
  order(field, { ascending = true } = {}) { this._orderField = field; this._orderAsc = ascending; return this }
  limit(n) { this._limitN = n; return this }
  single() { this._isSingle = true; return this }

  // Робить QueryBuilder thenable (await-able)
  then(resolve, reject) {
    Promise.resolve().then(() => this._execute()).then(resolve, reject)
  }

  _match(row) {
    return this._filters.every((f) => {
      if (f.type === 'eq') return row[f.field] === f.value
      if (f.type === 'in') return (f.values || []).includes(row[f.field])
      if (f.type === 'is') return f.value === null ? row[f.field] == null : row[f.field] === f.value
      return true
    })
  }

  _execute() {
    try {
      const db = loadDb()

      // Спеціальна обробка view flower_stock
      if (this._table === 'flower_stock') {
        let rows = computeFlowerStock(db).filter((r) => this._match(r))
        if (this._orderField) {
          rows.sort((a, b) => {
            if (a[this._orderField] < b[this._orderField]) return this._orderAsc ? -1 : 1
            if (a[this._orderField] > b[this._orderField]) return this._orderAsc ? 1 : -1
            return 0
          })
        }
        return { data: this._isSingle ? (rows[0] ?? null) : rows, error: null }
      }

      if (this._op === 'select') {
        let rows = (db[this._table] || []).filter((r) => this._match(r))
        if (this._orderField) {
          rows.sort((a, b) => {
            const av = a[this._orderField], bv = b[this._orderField]
            if (av < bv) return this._orderAsc ? -1 : 1
            if (av > bv) return this._orderAsc ? 1 : -1
            return 0
          })
        }
        if (this._limitN) rows = rows.slice(0, this._limitN)
        const { fields, relations } = parseSelectCols(this._selectStr)
        const includeAll = this._selectStr.trim() === '*' || fields.length === 0
        // Сначала связи (на полных строках), потом проекция. Включаем имена связей в проекцию.
        const resolved = resolveRelations(rows, this._table, relations, db)
        const allFields = [...fields, ...relations.map((r) => r.name)]
        const out = resolved.map((r) => projectRow(r, allFields, includeAll))
        return { data: this._isSingle ? (out[0] ?? null) : out, error: null }
      }

      if (this._op === 'insert') {
        const items = Array.isArray(this._insertData) ? this._insertData : [this._insertData]
        const inserted = items.map((item) => ({ id: genId(), created_at: new Date().toISOString(), ...item }))
        db[this._table] = [...(db[this._table] || []), ...inserted]
        saveDb(db)
        if (this._selectStr && this._selectStr !== '*') {
          const { fields, relations } = parseSelectCols(this._selectStr)
          const includeAll = fields.length === 0
          const resolved = resolveRelations(inserted, this._table, relations, db)
          const allFields = [...fields, ...relations.map((r) => r.name)]
          const out = resolved.map((r) => projectRow(r, allFields, includeAll))
          return { data: this._isSingle ? (out[0] ?? null) : out, error: null }
        }
        return { data: this._isSingle ? (inserted[0] ?? null) : inserted, error: null }
      }

      if (this._op === 'update') {
        let updatedRow = null
        db[this._table] = (db[this._table] || []).map((r) => {
          if (this._match(r)) { updatedRow = { ...r, ...this._updateData }; return updatedRow }
          return r
        })
        saveDb(db)
        if (this._isSingle && updatedRow && this._selectStr && this._selectStr !== '*') {
          const { fields, relations } = parseSelectCols(this._selectStr)
          const includeAll = fields.length === 0
          const resolved = resolveRelations([updatedRow], this._table, relations, db)
          const allFields = [...fields, ...relations.map((r) => r.name)]
          return { data: projectRow(resolved[0], allFields, includeAll) ?? null, error: null }
        }
        return { data: updatedRow, error: null }
      }

      if (this._op === 'delete') {
        db[this._table] = (db[this._table] || []).filter((r) => !this._match(r))
        saveDb(db)
        return { data: null, error: null }
      }

      return { data: null, error: null }
    } catch (err) {
      return { data: null, error: { message: err.message } }
    }
  }
}

export const supabase = {
  from: (table) => new QueryBuilder(table),
}

// Скидання бази до seed-даних: викликати window.resetFloristDb() в консолі браузера
if (typeof window !== 'undefined') {
  window.resetFloristDb = () => {
    localStorage.removeItem(DB_KEY)
    window.location.reload()
  }
}
