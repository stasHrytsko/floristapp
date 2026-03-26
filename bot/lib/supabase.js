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

// Только цветки из партий конкретного поставщика (quantity > 0), уникальные
async function getFlowersBySupplier(supplierId) {
  const { data, error } = await supabase
    .from('batches')
    .select('flower_id, flowers!inner(id, name)')
    .eq('supplier_id', supplierId)
    .gt('quantity', 0)
  if (error) throw error

  const seen = new Set()
  return data
    .filter((row) => {
      if (seen.has(row.flower_id)) return false
      seen.add(row.flower_id)
      return true
    })
    .map((row) => row.flowers)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

async function saveDelivery({ supplierId, items, deliveredAt }) {
  const { data: delivery, error: deliveryErr } = await supabase
    .from('deliveries')
    .insert({ supplier_id: supplierId, delivered_at: deliveredAt })
    .select('id')
    .single()
  if (deliveryErr) throw deliveryErr

  for (const item of items) {
    const { data: batch, error: batchErr } = await supabase
      .from('batches')
      .insert({ supplier_id: supplierId, flower_id: item.flowerId, quantity: item.quantity, delivered_at: deliveredAt })
      .select('id')
      .single()
    if (batchErr) throw batchErr

    const { error: itemErr } = await supabase
      .from('delivery_items')
      .insert({ delivery_id: delivery.id, flower_id: item.flowerId, quantity: item.quantity, batch_id: batch.id })
    if (itemErr) throw itemErr

    const { error: movErr } = await supabase
      .from('movements')
      .insert({ flower_id: item.flowerId, batch_id: batch.id, movement_type: 'поставка', quantity: item.quantity })
    if (movErr) throw movErr
  }

  return delivery.id
}

async function saveWriteOff(flowerId, quantity) {
  const { error } = await supabase
    .from('movements')
    .insert({ flower_id: flowerId, movement_type: 'списание', quantity })
  if (error) throw error
}

async function getAllStock() {
  const { data, error } = await supabase
    .from('flower_stock')
    .select('flower_id, name, available, reserved, total')
    .order('name')
  if (error) throw error
  return data
}

async function getLowStock() {
  const { data, error } = await supabase
    .from('flower_stock')
    .select('flower_id, name, available')
    .lt('available', 5)
    .order('available')
  if (error) throw error
  return data
}

async function searchFlowers(query) {
  const { data, error } = await supabase
    .from('flower_stock')
    .select('flower_id, name, available')
    .ilike('name', `${query}%`)
    .order('name')
  if (error) throw error
  return data
}

async function getFlowerStockById(flowerId) {
  const { data, error } = await supabase
    .from('flower_stock')
    .select('flower_id, name, available, reserved, total')
    .eq('flower_id', flowerId)
    .single()
  if (error) throw error
  return data
}

// date — необязательный ISO-строка ГГГГ-ММ-ДД для фильтрации по ready_at
async function getActiveOrders(date) {
  let query = supabase
    .from('orders')
    .select('id, client_name, ready_at, status, delivery_type, order_items(flower_id, quantity)')
    .in('status', ['резерв', 'продано'])
    .order('ready_at')
  if (date) query = query.eq('ready_at', date)
  const { data, error } = await query
  if (error) throw error
  return data
}

async function closeOrder(orderId, items) {
  const { error: updErr } = await supabase.from('orders').update({ status: 'продано' }).eq('id', orderId)
  if (updErr) throw updErr

  for (const item of items) {
    const { error: movErr } = await supabase
      .from('movements')
      .insert({ flower_id: item.flower_id, order_id: orderId, movement_type: 'выдача', quantity: item.quantity })
    if (movErr) throw movErr
  }
}

async function getFlowerStock() {
  const { data, error } = await supabase
    .from('flower_stock')
    .select('flower_id, name, available')
    .gt('available', 0)
    .order('name')
  if (error) throw error
  return data
}

async function saveOrder({ clientName, clientPhone, deliveryType, address, readyAt, items }) {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      client_name: clientName,
      client_phone: clientPhone,
      delivery_type: deliveryType,
      delivery_address: address,
      ready_at: readyAt,
      status: 'резерв',
    })
    .select('id')
    .single()
  if (orderErr) throw orderErr

  const orderItems = items.map((item) => ({
    order_id: order.id,
    flower_id: item.flowerId,
    quantity: item.quantity,
  }))
  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
  if (itemsErr) throw itemsErr

  const movements = items.map((item) => ({
    flower_id: item.flowerId,
    order_id: order.id,
    movement_type: 'резерв',
    quantity: item.quantity,
  }))
  const { error: movErr } = await supabase.from('movements').insert(movements)
  if (movErr) throw movErr

  return order.id
}

// Активные партии на складе (quantity > 0), от старых к новым
async function getActiveBatches() {
  const { data, error } = await supabase
    .from('batches')
    .select('id, quantity, delivered_at, flowers(name), suppliers(name)')
    .gt('quantity', 0)
    .order('delivered_at')
  if (error) throw error
  return data
}

module.exports = { getSuppliers, createSupplier, getFlowers, getFlowersBySupplier, getFlowerStock, getAllStock, getLowStock, searchFlowers, getFlowerStockById, getActiveOrders, closeOrder, saveDelivery, saveWriteOff, saveOrder, getActiveBatches }
