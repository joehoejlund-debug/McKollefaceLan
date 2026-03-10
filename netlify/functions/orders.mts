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
    const validItems = ['toast', 'soda', 'water']
    for (const item of items) {
      if (!validItems.includes(item.name) || typeof item.quantity !== 'number' || item.quantity < 1) {
        return Response.json(
          { error: 'Invalid item: ' + item.name },
          { status: 400 }
        )
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

  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

export const config: Config = {
  path: '/api/orders',
  method: ['GET', 'POST'],
}
