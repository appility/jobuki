import { createClient } from 'redis'

let redis: ReturnType<typeof createClient> | null = null

const TTL_SECONDS = 5 * 60 // 5 minutes

function getClient() {
  if (!redis) {
    let url = process.env.REDIS_URL

    // If REDIS_PRIVATE_URL is set (Railway private endpoint), construct full URL
    if (process.env.REDIS_PRIVATE_URL) {
      const host = process.env.REDIS_PRIVATE_URL
      const port = process.env.REDIS_PORT || '6379'
      const password = process.env.REDIS_PASSWORD || ''
      url = password
        ? `redis://:${password}@${host}:${port}`
        : `redis://${host}:${port}`
    }

    redis = createClient({
      url,
    })
    redis.on('error', (err) => console.error('Redis error:', err))
  }
  return redis
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (!process.env.REDIS_PRIVATE_URL && !process.env.REDIS_URL) return undefined
  try {
    const client = getClient()
    if (!client.isOpen) await client.connect()
    const value = await client.get(key)
    return value ? JSON.parse(value) as T : undefined
  } catch (err) {
    console.error('Cache get error:', err)
    return undefined
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = TTL_SECONDS): Promise<void> {
  if (!process.env.REDIS_PRIVATE_URL && !process.env.REDIS_URL) return
  try {
    const client = getClient()
    if (!client.isOpen) await client.connect()
    await client.setEx(key, ttlSeconds, JSON.stringify(value))
  } catch (err) {
    console.error('Cache set error:', err)
  }
}

export async function cacheInvalidate(prefix: string): Promise<void> {
  if (!process.env.REDIS_PRIVATE_URL && !process.env.REDIS_URL) return
  try {
    const client = getClient()
    if (!client.isOpen) await client.connect()
    const keys = await client.keys(`${prefix}*`)
    if (keys.length > 0) {
      await client.del(keys)
    }
  } catch (err) {
    console.error('Cache invalidate error:', err)
  }
}

export async function cacheClear(): Promise<void> {
  if (!process.env.REDIS_PRIVATE_URL && !process.env.REDIS_URL) return
  try {
    const client = getClient()
    if (!client.isOpen) await client.connect()
    await client.flushDb()
  } catch (err) {
    console.error('Cache clear error:', err)
  }
}
