import { createClient } from 'redis'

let redis: ReturnType<typeof createClient> | null = null
let cacheEnabled = false

const TTL_SECONDS = 5 * 60 // 5 minutes

function initCache() {
  // Only enable caching if we have a valid Redis URL
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    cacheEnabled = false
    return
  }

  try {
    redis = createClient({ url: redisUrl })
    redis.on('error', (err) => {
      console.error('Redis error:', err)
      cacheEnabled = false
    })
    cacheEnabled = true
  } catch (err) {
    console.error('Failed to initialize Redis:', err)
    cacheEnabled = false
  }
}

function getClient() {
  if (!cacheEnabled || !redis) {
    initCache()
  }
  return redis
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (!cacheEnabled) return undefined
  try {
    const client = getClient()
    if (!client || !client.isOpen) await client?.connect()
    const value = await client?.get(key)
    return value ? JSON.parse(value) as T : undefined
  } catch (err) {
    console.error('Cache get error:', err)
    cacheEnabled = false
    return undefined
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = TTL_SECONDS): Promise<void> {
  if (!cacheEnabled) return
  try {
    const client = getClient()
    if (!client || !client.isOpen) await client?.connect()
    await client?.setEx(key, ttlSeconds, JSON.stringify(value))
  } catch (err) {
    console.error('Cache set error:', err)
    cacheEnabled = false
  }
}

export async function cacheInvalidate(prefix: string): Promise<void> {
  if (!cacheEnabled) return
  try {
    const client = getClient()
    if (!client || !client.isOpen) await client?.connect()
    const keys = await client?.keys(`${prefix}*`)
    if (keys && keys.length > 0) {
      await client?.del(keys)
    }
  } catch (err) {
    console.error('Cache invalidate error:', err)
    cacheEnabled = false
  }
}

export async function cacheClear(): Promise<void> {
  if (!cacheEnabled) return
  try {
    const client = getClient()
    if (!client || !client.isOpen) await client?.connect()
    await client?.flushDb()
  } catch (err) {
    console.error('Cache clear error:', err)
    cacheEnabled = false
  }
}
