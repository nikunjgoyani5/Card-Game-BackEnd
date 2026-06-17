import redis from "../config/redis";

/**
 * Execute Redis command with timeout protection
 * If Redis is unavailable or times out, returns null instead of hanging
 */
export async function safeRedisGet(
  key: string,
  timeoutMs: number = 500
): Promise<string | null> {
  try {
    return await Promise.race([
      redis.get(key),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      ),
    ]);
  } catch (error) {
    // Silent fail for connection errors
    return null;
  }
}

export async function safeRedisSet(
  key: string,
  value: string,
  timeoutMs: number = 500
): Promise<boolean> {
  try {
    const result = await Promise.race([
      redis.set(key, value),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      ),
    ]);
    return result === "OK";
  } catch (error) {
    return false;
  }
}

export async function safeRedisSetex(
  key: string,
  seconds: number,
  value: string,
  timeoutMs: number = 500
): Promise<boolean> {
  try {
    const result = await Promise.race([
      redis.setex(key, seconds, value),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      ),
    ]);
    return result === "OK";
  } catch (error) {
    return false;
  }
}

export async function safeRedisHgetall(
  key: string,
  timeoutMs: number = 500
): Promise<Record<string, string>> {
  try {
    const result = await Promise.race([
      redis.hgetall(key),
      new Promise<Record<string, string>>((resolve) =>
        setTimeout(() => resolve({}), timeoutMs)
      ),
    ]);
    return result || {};
  } catch (error) {
    return {};
  }
}

export async function safeRedisHset(
  key: string,
  value: Record<string, any>,
  timeoutMs: number = 500
): Promise<boolean> {
  try {
    await Promise.race([
      redis.hset(key, value),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      ),
    ]);
    return true;
  } catch (error) {
    return false;
  }
}

export async function safeRedisDel(
  key: string,
  timeoutMs: number = 500
): Promise<boolean> {
  try {
    await Promise.race([
      redis.del(key),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      ),
    ]);
    return true;
  } catch (error) {
    return false;
  }
}

export async function safeRedisIncr(
  key: string,
  timeoutMs: number = 500
): Promise<number> {
  try {
    const result = await Promise.race([
      redis.incr(key),
      new Promise<number>((resolve) => setTimeout(() => resolve(0), timeoutMs)),
    ]);
    return result || 0;
  } catch (error) {
    return 0;
  }
}

export async function safeRedisExpire(
  key: string,
  seconds: number,
  timeoutMs: number = 500
): Promise<boolean> {
  try {
    await Promise.race([
      redis.expire(key, seconds),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      ),
    ]);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Fire and forget Redis operations - don't wait for response
 * Use for non-critical operations like caching
 */
export function asyncRedisSet(key: string, value: string, ttl?: number): void {
  (async () => {
    try {
      if (ttl) {
        await redis.setex(key, ttl, value);
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      // Silent fail
    }
  })();
}

export function asyncRedisDel(...keys: string[]): void {
  (async () => {
    try {
      await redis.del(...keys);
    } catch (error) {
      // Silent fail
    }
  })();
}
