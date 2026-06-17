import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const TTL_SECONDS = 5 * 60 // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return undefined
  try {
    const value = await redis.get(key)
    return value as T | undefined
  } catch (err) {
    console.error('Cache get error:', err)
    return undefined
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = TTL_SECONDS): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch (err) {
    console.error('Cache set error:', err)
  }
}

export async function cacheInvalidate(prefix: string): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return
  try {
    const keys = await redis.keys(`${prefix}*`)
    if (keys.length > 0) {
      await redis.del(...(keys as string[]))
    }
  } catch (err) {
    console.error('Cache invalidate error:', err)
  }
}

export async function cacheClear(): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return
  try {
    await redis.flushdb()
  } catch (err) {
    console.error('Cache clear error:', err)
  }
}
