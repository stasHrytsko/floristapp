'use strict'

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL) throw new Error('SUPABASE_URL не задан в .env')
if (!SUPABASE_KEY) throw new Error('SUPABASE_KEY не задан в .env')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function getSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, phone')
    .order('name')
  if (error) throw error
  return data
}

async function createSupplier(name, phone) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name, phone })
    .select('id, name, phone')
    .single()
  if (error) throw error
  return data
}

async function getFlowers() {
  const { data, error } = await supabase
    .from('flowers')
    .select('id, name')
    .order('name')
  if (error) throw error
  return data
}

async function saveDelivery({ supplierId, items, defectType, deliveredAt }) {
  // Создаём запись поставки
  const { data: delivery, error: deliveryErr } = await supabase
    .from('deliveries')
    .insert({
      supplier_id: supplierId,
      delivered_at: deliveredAt,
      status: 'на складе',
      has_issues: defectType !== 'нет',
    })
    .select('id')
    .single()
  if (deliveryErr) throw deliveryErr

  for (const item of items) {
    // Создаём партию
    const notes = defectType !== 'нет' ? `Брак: ${defectType}` : null
    const { data: batch, error: batchErr } = await supabase
      .from('batches')
      .insert({
        supplier_id: supplierId,
        flower_id: item.flowerId,
        quantity: item.quantity,
        delivered_at: deliveredAt,
        notes,
      })
      .select('id')
      .single()
    if (batchErr) throw batchErr

    // Создаём позицию поставки
    const { error: itemErr } = await supabase
      .from('delivery_items')
      .insert({
        delivery_id: delivery.id,
        flower_id: item.flowerId,
        quantity: item.quantity,
        batch_id: batch.id,
        reception_status: defectType !== 'нет' ? 'брак' : 'ok',
      })
    if (itemErr) throw itemErr

    // Создаём движение (пополнение остатка)
    const { error: movErr } = await supabase
      .from('movements')
      .insert({
        flower_id: item.flowerId,
        batch_id: batch.id,
        movement_type: 'поставка',
        quantity: item.quantity,
      })
    if (movErr) throw movErr
  }

  return delivery.id
}

module.exports = { getSuppliers, createSupplier, getFlowers, saveDelivery }
