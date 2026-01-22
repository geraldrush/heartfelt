// Rate limiting middleware using Cloudflare Workers KV
export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    keyGenerator = (c) => c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (c, next) => {
    const key = `rate_limit:${keyGenerator(c)}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Get current request count from KV (if available) or use in-memory fallback
      let requestCount = 0;
      let lastReset = now;

      if (c.env.RATE_LIMIT_KV) {
        const stored = await c.env.RATE_LIMIT_KV.get(key, 'json');
        if (stored && stored.lastReset > windowStart) {
          requestCount = stored.count;
          lastReset = stored.lastReset;
        }
      }

      // Check if limit exceeded
      if (requestCount >= max) {
        return c.json({
          error: 'Too many requests',
          retryAfter: Math.ceil((lastReset + windowMs - now) / 1000)
        }, 429);
      }

      // Process request
      await next();

      // Only count if not skipping successful requests
      if (!skipSuccessfulRequests || c.res.status >= 400) {
        requestCount++;
        
        // Store updated count
        if (c.env.RATE_LIMIT_KV) {
          await c.env.RATE_LIMIT_KV.put(key, JSON.stringify({
            count: requestCount,
            lastReset: lastReset
          }), { expirationTtl: Math.ceil(windowMs / 1000) });
        }
      }

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if there's an error
      await next();
    }
  };
};

// Specific rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 100, // 100 requests per 15 minutes
});

export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
});