import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  const store = getStore({ name: 'chat', consistency: 'strong' })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    if (type === 'dm') {
      const user = url.searchParams.get('user')
      if (!user) {
        return Response.json({ error: 'user param required' }, { status: 400 })
      }

      // Get all DMs between this user and Kitchen
      const { blobs } = await store.list({ prefix: 'dm/' })
      const messages: any[] = []

      for (const blob of blobs) {
        const msg = await store.get(blob.key, { type: 'json' }) as any
        if (!msg) continue
        // Show messages where user is sender or recipient
        if (
          (msg.from === user && msg.to === 'Kitchen') ||
          (msg.from === 'Kitchen' && msg.to === user)
        ) {
          messages.push(msg)
        }
      }

      messages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      return Response.json(messages)
    }

    if (type === 'dm-all') {
      // Kitchen: get all DM conversations grouped by user
      const { blobs } = await store.list({ prefix: 'dm/' })
      const conversations: Record<string, any[]> = {}

      for (const blob of blobs) {
        const msg = await store.get(blob.key, { type: 'json' }) as any
        if (!msg) continue
        const otherUser = msg.from === 'Kitchen' ? msg.to : msg.from
        if (!conversations[otherUser]) conversations[otherUser] = []
        conversations[otherUser].push(msg)
      }

      // Sort each conversation by time
      for (const user of Object.keys(conversations)) {
        conversations[user].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      }

      return Response.json(conversations)
    }

    if (type === 'global') {
      const { blobs } = await store.list({ prefix: 'global/' })
      const messages: any[] = []

      for (const blob of blobs) {
        const msg = await store.get(blob.key, { type: 'json' }) as any
        if (msg) messages.push(msg)
      }

      messages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      return Response.json(messages)
    }

    return Response.json({ error: 'Invalid type param' }, { status: 400 })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { type, from, to, message } = body

    if (!from || !message || typeof message !== 'string' || message.trim().length === 0) {
      return Response.json({ error: 'from and message are required' }, { status: 400 })
    }

    if (type === 'dm') {
      if (!to) {
        return Response.json({ error: 'to is required for DMs' }, { status: 400 })
      }

      const id = 'dm/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      const msg = {
        id,
        from: String(from).slice(0, 30),
        to: String(to).slice(0, 30),
        message: String(message).slice(0, 500),
        timestamp: new Date().toISOString(),
      }

      await store.setJSON(id, msg)
      return Response.json(msg, { status: 201 })
    }

    if (type === 'global') {
      const id = 'global/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      const msg = {
        id,
        from: String(from).slice(0, 30),
        message: String(message).slice(0, 500),
        timestamp: new Date().toISOString(),
      }

      await store.setJSON(id, msg)
      return Response.json(msg, { status: 201 })
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 })
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

export const config: Config = {
  path: '/api/chat',
  method: ['GET', 'POST'],
}
