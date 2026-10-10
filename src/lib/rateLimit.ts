/**
 * Simple in-memory rate limiter.
 * Resets on cold-start, which is acceptable for Next.js serverless.
 * For edge/stateless: swap for Upstash Redis.
 */
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request is within limits.
 * Returns false if the limit has been exceeded.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count++;
  return true;
}
