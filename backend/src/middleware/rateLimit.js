const inMemoryStore = new Map();
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return; // Cleanup every 5 minutes
  
  for (const [key, data] of inMemoryStore.entries()) {
    if (now > data.resetTime) {
      inMemoryStore.delete(key);
    }
  }
  lastCleanup = now;
}

function createRateLimiter({ windowMs, max, message }) {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const key = `rate_limit:${ip}`;
    const now = Date.now();
    const resetTime = now + windowMs;
    
    let count = 0;
    let currentResetTime = resetTime;
    
    try {
      // Try KV first
      if (c.env.RATE_LIMIT_KV) {
        const stored = await c.env.RATE_LIMIT_KV.get(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (now < data.resetTime) {
            count = data.count;
            currentResetTime = data.resetTime;
          }
        }
      } else {
        // Use in-memory fallback
        console.log('[RateLimit] Using in-memory storage (KV not available)');
        cleanupExpiredEntries();
        
        const stored = inMemoryStore.get(key);
        if (stored && now < stored.resetTime) {
          count = stored.count;
          currentResetTime = stored.resetTime;
        }
      }
    } catch (error) {
      console.error('[RateLimit] Storage error, using in-memory fallback:', error);
      const stored = inMemoryStore.get(key);
      if (stored && now < stored.resetTime) {
        count = stored.count;
        currentResetTime = stored.resetTime;
      }
    }
    
    const remaining = Math.max(0, max - count - 1);
    
    // Add rate limit headers
    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(currentResetTime / 1000).toString());
    
    if (count >= max) {
      const retryAfter = Math.ceil((currentResetTime - now) / 1000);
      console.warn(`[RateLimit] Limit exceeded for key: ${key}, limit: ${max}, window: ${windowMs}ms`);
      c.header('Retry-After', retryAfter.toString());
      return c.json({ error: message || 'Too many requests', retryAfter }, 429);
    }
    
    // Increment counter
    const newCount = count + 1;
    const data = { count: newCount, resetTime: currentResetTime };
    
    try {
      if (c.env.RATE_LIMIT_KV) {
        await c.env.RATE_LIMIT_KV.put(key, JSON.stringify(data), { expirationTtl: Math.ceil(windowMs / 1000) });
      } else {
        inMemoryStore.set(key, data);
      }
    } catch (error) {
      console.error('[RateLimit] Failed to update storage:', error);
      inMemoryStore.set(key, data);
    }
    
    await next();
  };
}

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts. Please try again later.'
});

export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many API requests. Please try again later.'
});

export const chatRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many chat requests. Please slow down.'
});

export const connectionRequestRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many connection requests. Please try again later.'
});