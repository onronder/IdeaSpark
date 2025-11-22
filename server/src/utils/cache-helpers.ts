import { cache } from './redis';
import { logger } from './logger';

const cacheLogger = logger.child({ module: 'cache-helpers' });

/**
 * Cache key builders following production-grade naming convention
 * Pattern: app:{env}:{domain}:{entity}:{id}:{sub-entity?}
 *
 * Note: Environment prefix is automatically added by redis.ts
 * So we only need: {domain}:{entity}:{id}
 */
export const CacheKeys = {
  // Authentication & User domain
  user: (userId: string) => `auth:user:${userId}`,
  subscription: (userId: string) => `auth:subscription:${userId}`,
  tokenBlacklist: (token: string) => `auth:blacklist:token:${token}`,

  // Quota domain (for rate limiting and usage tracking)
  quotaDaily: (userId: string, date: string) => `quota:user:${userId}:daily:${date}`,
  quotaMonthly: (userId: string, month: string) => `quota:user:${userId}:monthly:${month}`,

  // Rate limiting domain
  rateLimit: (identifier: string, window: string) => `rl:${identifier}:${window}`,

  // Idea session cache domain
  ideaSession: (sessionId: string) => `cache:idea:session:${sessionId}`,
  ideaSessionList: (userId: string, status?: string) =>
    `cache:idea:list:${userId}${status ? `:${status}` : ''}`,

  // AI usage tracking
  aiCost: (userId: string, date: string) => `ai:cost:${userId}:${date}`,
};

/**
 * TTL configurations (in seconds) based on Supabase + IdeaSpark best practices
 */
export const CacheTTL = {
  // User data (high read, low write)
  USER_PROFILE: 120, // 2 minutes - frequent enough to catch updates
  SUBSCRIPTION: 300, // 5 minutes - changes rarely

  // Token blacklist (must match JWT expiry)
  TOKEN_BLACKLIST: 900, // 15 minutes (matches JWT access token expiry)

  // Quota counters
  QUOTA_DAILY: 86400, // 24 hours
  QUOTA_MONTHLY: 2592000, // 30 days

  // Rate limiting windows
  RATE_LIMIT_MINUTE: 60,
  RATE_LIMIT_HOUR: 3600,
  RATE_LIMIT_DAY: 86400,

  // Idea sessions
  IDEA_SESSION: 60, // 1 minute - frequently updated
  IDEA_SESSION_LIST: 60, // 1 minute

  // AI cost tracking
  AI_COST: 86400, // 24 hours

  // Health checks
  HEALTH_CHECK: 5, // 5 seconds
};

/**
 * Generic cache-aside pattern implementation
 *
 * @param key - Cache key (use CacheKeys helpers)
 * @param fetcher - Function to fetch data from source (e.g., database)
 * @param ttl - Time to live in seconds
 * @returns Data from cache or source
 */
export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Step 1: Try to get from cache
  const cached = await cache.get(key);

  if (cached) {
    try {
      const data = JSON.parse(cached) as T;
      cacheLogger.debug({ key }, 'Cache HIT');
      return data;
    } catch (error) {
      cacheLogger.warn({ key, error }, 'Failed to parse cached data - fetching fresh');
      // Continue to fetch if JSON parse fails
    }
  } else {
    cacheLogger.debug({ key }, 'Cache MISS');
  }

  // Step 2: Fetch from source
  const data = await fetcher();

  // Step 3: Store in cache (fire-and-forget, don't block response)
  cache.set(key, JSON.stringify(data), ttl).catch((error) => {
    cacheLogger.warn({ key, error }, 'Failed to cache data');
  });

  return data;
}

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate all user-related cache
   */
  async user(userId: string): Promise<void> {
    const keys = [
      CacheKeys.user(userId),
      CacheKeys.subscription(userId),
    ];

    await Promise.all(keys.map(key => cache.del(key)));
    cacheLogger.info({ userId }, 'Invalidated user cache');
  },

  /**
   * Invalidate idea session cache
   */
  async ideaSession(sessionId: string, userId?: string): Promise<void> {
    const keys = [CacheKeys.ideaSession(sessionId)];

    // Also invalidate user's session list if provided
    if (userId) {
      keys.push(CacheKeys.ideaSessionList(userId));
      keys.push(CacheKeys.ideaSessionList(userId, 'ACTIVE'));
      keys.push(CacheKeys.ideaSessionList(userId, 'ARCHIVED'));
    }

    await Promise.all(keys.map(key => cache.del(key)));
    cacheLogger.info({ sessionId, userId }, 'Invalidated idea session cache');
  },

  /**
   * Invalidate subscription cache (e.g., after subscription update)
   */
  async subscription(userId: string): Promise<void> {
    await cache.del(CacheKeys.subscription(userId));
    cacheLogger.info({ userId }, 'Invalidated subscription cache');
  },

  /**
   * Blacklist a JWT token (for logout)
   */
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    const key = CacheKeys.tokenBlacklist(token);
    await cache.set(key, '1', ttlSeconds);
    cacheLogger.info('Token blacklisted');
  },
};

/**
 * Quota tracking helpers
 */
export const QuotaHelpers = {
  /**
   * Increment daily quota counter
   * @returns Current count after increment
   */
  async incrementDaily(userId: string): Promise<number> {
    const today = (new Date().toISOString().split('T')[0] ?? '') as string; // YYYY-MM-DD
    const key = CacheKeys.quotaDaily(userId, today);

    const count = await cache.incr(key);

    // Set expiry on first increment
    if (count === 1) {
      // Calculate seconds until end of day
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const ttl = Math.floor((endOfDay.getTime() - Date.now()) / 1000);
      await cache.expire(key, ttl);
    }

    return count || 1;
  },

  /**
   * Get daily quota usage
   */
  async getDaily(userId: string): Promise<number> {
    const today = (new Date().toISOString().split('T')[0] ?? '') as string;
    const key = CacheKeys.quotaDaily(userId, today);
    const value = await cache.get(key);
    return value ? parseInt(value, 10) : 0;
  },

  /**
   * Reset daily quota (for testing or manual override)
   */
  async resetDaily(userId: string): Promise<void> {
    const today = (new Date().toISOString().split('T')[0] ?? '') as string;
    await cache.del(CacheKeys.quotaDaily(userId, today));
    cacheLogger.info({ userId }, 'Reset daily quota');
  },
};

/**
 * Rate limiting helpers (complementary to express-rate-limit)
 */
export const RateLimitHelpers = {
  /**
   * Check if rate limit is exceeded
   * @param identifier - User ID, IP, or email
   * @param window - Time window (e.g., 'minute', 'hour')
   * @param max - Maximum allowed requests
   * @returns true if rate limit exceeded
   */
  async isExceeded(identifier: string, window: string, max: number): Promise<boolean> {
    const key = CacheKeys.rateLimit(identifier, window);
    const count = await cache.get(key);

    if (!count) return false;

    return parseInt(count, 10) >= max;
  },

  /**
   * Increment rate limit counter
   */
  async increment(identifier: string, window: string, ttl: number): Promise<number> {
    const key = CacheKeys.rateLimit(identifier, window);
    const count = await cache.incr(key);

    if (count === 1) {
      await cache.expire(key, ttl);
    }

    return count || 1;
  },
};

/**
 * Cache metrics tracking (for observability)
 */
export const cacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  totalLatency: 0,
  operationCount: 0,

  recordHit(): void {
    this.hits++;
  },

  recordMiss(): void {
    this.misses++;
  },

  recordError(): void {
    this.errors++;
  },

  recordLatency(ms: number): void {
    this.totalLatency += ms;
    this.operationCount++;
  },

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      avgLatency: this.operationCount > 0 ? this.totalLatency / this.operationCount : 0,
    };
  },

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    this.totalLatency = 0;
    this.operationCount = 0;
  },
};
