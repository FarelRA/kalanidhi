/**
 * Small in-process rate limiter for public checkout and status lookup.
 *
 * This is a best-effort guard for a single Node process. Production should
 * front the routes with the deployment edge or a shared store; the state here
 * is intentionally simple and resets on restart.
 */
export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export type RateLimiterOptions = {
  limit: number
  windowMs: number
  now?: () => number
}

type Bucket = { startedAt: number; count: number }

export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>()
  const clock = options.now ?? Date.now

  function consume(key: string): RateLimitResult {
    const now = clock()
    const bucket = buckets.get(key)

    if (!bucket || now - bucket.startedAt >= options.windowMs) {
      buckets.set(key, { startedAt: now, count: 1 })
      return {
        allowed: true,
        remaining: Math.max(0, options.limit - 1),
        retryAfterMs: 0,
      }
    }

    if (bucket.count >= options.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: options.windowMs - (now - bucket.startedAt),
      }
    }

    bucket.count += 1
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - bucket.count),
      retryAfterMs: 0,
    }
  }

  function reset(key?: string) {
    if (key) buckets.delete(key)
    else buckets.clear()
  }

  return { consume, reset }
}

export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  const candidate = forwarded?.split(",")[0]?.trim()
  return candidate || headers.get("x-real-ip") || "unknown"
}

/** Checkout creation: five attempts per ten minutes per client. */
export const checkoutRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 10 * 60 * 1000,
})

/** Order status and payment polling: sixty reads per minute per client. */
export const statusRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000,
})
