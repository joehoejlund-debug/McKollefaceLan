import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  const store = getStore({ name: 'orders', consistency: 'strong' })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const nameFilter = url.searchParams.get('name')

    const { blobs } = await store.list({ prefix: 'order/' })

    const orders = []
    for (const blob of blobs) {
      const order = await store.get(blob.key, { type: 'json' })
      if (order) orders.push(order)
    }

    // Sort newest first
    orders.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const result = nameFilter
      ? orders.filter((o: any) => o.name === nameFilter)
      : orders

    return Response.json(result)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { name, items } = body

    if (!name || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: 'Name and at least one item are required' },
        { status: 400 }
      )
    }

    // Validate items
    const validItems = ['toast', 'cola', 'fanta', 'xray']
    const validToppings = ['Veggie pålæg', 'Hamburgerryg', 'Ketchup', 'Sennep', 'Mayo', 'Remoulade', 'Oregano', 'Ost', 'Cornichonner']
    for (const item of items) {
      if (!validItems.includes(item.name) || typeof item.quantity !== 'number' || item.quantity < 1) {
        return Response.json(
          { error: 'Invalid item: ' + item.name },
          { status: 400 }
        )
      }
      // Validate toppings for toast
      if (item.name === 'toast' && item.toppings) {
        if (!Array.isArray(item.toppings) || !item.toppings.every((t: string) => validToppings.includes(t))) {
          return Response.json(
            { error: 'Invalid toppings' },
            { status: 400 }
          )
        }
      }
    }

    const id = 'order/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const order = {
      id,
      name: String(name).slice(0, 30),
      items,
      timestamp: new Date().toISOString(),
    }

    await store.setJSON(id, order)

    return Response.json(order, { status: 201 })
  }

  if (req.method === 'DELETE') {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return Response.json({ error: 'Order id is required' }, { status: 400 })
    }

    try {
      await store.delete(id)
      return Response.json({ success: true })
    } catch {
      return Response.json({ error: 'Failed to delete order' }, { status: 500 })
    }
  }

  if (req.method === 'PUT') {
    const body = await req.json()
    const { id, items } = body

    if (!id || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Order id and items are required' }, { status: 400 })
    }

    const validItems = ['toast', 'cola', 'fanta', 'xray']
    const validToppings = ['Veggie pålæg', 'Hamburgerryg', 'Ketchup', 'Sennep', 'Mayo', 'Remoulade', 'Oregano', 'Ost', 'Cornichonner']
    for (const item of items) {
      if (!validItems.includes(item.name) || typeof item.quantity !== 'number' || item.quantity < 1) {
        return Response.json({ error: 'Invalid item: ' + item.name }, { status: 400 })
      }
      if (item.name === 'toast' && item.toppings) {
        if (!Array.isArray(item.toppings) || !item.toppings.every((t: string) => validToppings.includes(t))) {
          return Response.json({ error: 'Invalid toppings' }, { status: 400 })
        }
      }
    }

    const existing = await store.get(id, { type: 'json' }) as any
    if (!existing) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    existing.items = items
    await store.setJSON(id, existing)
    return Response.json(existing)
  }

  if (req.method === 'PATCH') {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return Response.json({ error: 'Order id is required' }, { status: 400 })
    }

    const existing = await store.get(id, { type: 'json' }) as any
    if (!existing) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    existing.done = true
    await store.setJSON(id, existing)
    return Response.json(existing)
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

export const config: Config = {
  path: '/api/orders',
  method: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
}
