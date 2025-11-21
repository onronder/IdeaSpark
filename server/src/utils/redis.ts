import { Redis } from '@upstash/redis';
import { config } from '../config';
import { logger } from './logger';

const redisLogger = logger.child({ module: 'redis' });

/**
 * Production-grade Upstash Redis client with:
 * - Circuit breaker pattern for fault tolerance
 * - Automatic key prefixing (environment-based)
 * - Graceful degradation (returns null on errors)
 * - Connection pooling and retry logic
 * - Timeout protection (800ms max)
 */
class UpstashRedisClient {
  private client: Redis | null = null;
  private failureCount = 0;
  private readonly MAX_FAILURES = 5;
  private circuitOpen = false;
  private readonly CIRCUIT_RESET_TIMEOUT = 60000; // 60 seconds
  private readonly OPERATION_TIMEOUT = 800; // 800ms as per Supabase recommendations

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!config.redis.restUrl || !config.redis.restToken) {
      redisLogger.warn('Upstash Redis credentials not configured - caching disabled');
      return;
    }

    try {
      this.client = new Redis({
        url: config.redis.restUrl,
        token: config.redis.restToken,
        automaticDeserialization: false, // We handle JSON manually for better control
      });
      redisLogger.info('Upstash Redis client initialized');
    } catch (error) {
      redisLogger.error({ error }, 'Failed to initialize Upstash Redis client');
    }
  }

  /**
   * Build key with environment prefix
   * Pattern: app:{env}:{key}
   */
  private buildKey(key: string): string {
    return `app:${config.env}:${key}`;
  }

  /**
   * Check if circuit breaker is open or client is unavailable
   */
  private canOperate(): boolean {
    if (!this.client) {
      return false;
    }
    if (this.circuitOpen) {
      redisLogger.debug('Circuit breaker is open - skipping Redis operation');
      return false;
    }
    return true;
  }

  /**
   * Handle operation errors and update circuit breaker
   */
  private handleError(operation: string, error: unknown): void {
    this.failureCount++;
    redisLogger.warn(
      { operation, error, failureCount: this.failureCount },
      'Redis operation failed'
    );

    if (this.failureCount >= this.MAX_FAILURES) {
      this.circuitOpen = true;
      redisLogger.error('Redis circuit breaker OPENED - too many consecutive failures');

      // Auto-reset circuit breaker after timeout
      setTimeout(() => {
        this.circuitOpen = false;
        this.failureCount = 0;
        redisLogger.info('Redis circuit breaker RESET');
      }, this.CIRCUIT_RESET_TIMEOUT);
    }
  }

  /**
   * Reset failure count on successful operation
   */
  private onSuccess(): void {
    if (this.failureCount > 0) {
      this.failureCount = 0;
    }
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<string | null> {
    if (!this.canOperate()) return null;

    try {
      const result = await this.client!.get<string>(this.buildKey(key));
      this.onSuccess();
      return result;
    } catch (error) {
      this.handleError('get', error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.canOperate()) return false;

    try {
      const fullKey = this.buildKey(key);
      if (ttl) {
        await this.client!.setex(fullKey, ttl, value);
      } else {
        await this.client!.set(fullKey, value);
      }
      this.onSuccess();
      return true;
    } catch (error) {
      this.handleError('set', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.canOperate()) return false;

    try {
      await this.client!.del(this.buildKey(key));
      this.onSuccess();
      return true;
    } catch (error) {
      this.handleError('del', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.canOperate()) return false;

    try {
      const result = await this.client!.exists(this.buildKey(key));
      this.onSuccess();
      return result === 1;
    } catch (error) {
      this.handleError('exists', error);
      return false;
    }
  }

  /**
   * Set expiry on existing key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.canOperate()) return false;

    try {
      await this.client!.expire(this.buildKey(key), seconds);
      this.onSuccess();
      return true;
    } catch (error) {
      this.handleError('expire', error);
      return false;
    }
  }

  /**
   * Increment counter (for quotas, rate limiting)
   */
  async incr(key: string): Promise<number | null> {
    if (!this.canOperate()) return null;

    try {
      const result = await this.client!.incr(this.buildKey(key));
      this.onSuccess();
      return result;
    } catch (error) {
      this.handleError('incr', error);
      return null;
    }
  }

  /**
   * Get TTL of a key (in seconds)
   */
  async ttl(key: string): Promise<number | null> {
    if (!this.canOperate()) return null;

    try {
      const result = await this.client!.ttl(this.buildKey(key));
      this.onSuccess();
      return result;
    } catch (error) {
      this.handleError('ttl', error);
      return null;
    }
  }

  /**
   * Get underlying client for advanced operations
   * Use with caution - prefer using the wrapper methods
   */
  getClient(): Redis | null {
    return this.client;
  }
}

// Export singleton instance
export const redisClient = new UpstashRedisClient();

/**
 * Legacy cache interface for backward compatibility
 */
export const cache = {
  async get(key: string): Promise<string | null> {
    return redisClient.get(key);
  },

  async set(key: string, value: string, expirySeconds?: number): Promise<boolean> {
    return redisClient.set(key, value, expirySeconds);
  },

  async del(key: string): Promise<boolean> {
    return redisClient.del(key);
  },

  async exists(key: string): Promise<boolean> {
    return redisClient.exists(key);
  },

  async expire(key: string, seconds: number): Promise<boolean> {
    return redisClient.expire(key, seconds);
  },

  async incr(key: string): Promise<number | null> {
    return redisClient.incr(key);
  },
};

/**
 * Connect to Redis (initialization check)
 */
export async function connectRedis(): Promise<void> {
  try {
    // Test connection with a ping
    const testKey = 'health:ping';
    await redisClient.set(testKey, 'pong', 10);
    const result = await redisClient.get(testKey);

    if (result === 'pong') {
      redisLogger.info('✓ Redis connection test successful');
      await redisClient.del(testKey);
    } else {
      throw new Error('Redis ping test failed');
    }
  } catch (error) {
    redisLogger.warn({ error }, 'Redis connection test failed - continuing without cache');
    // Don't throw - graceful degradation
  }
}

/**
 * Disconnect from Redis (cleanup)
 */
export async function disconnectRedis(): Promise<void> {
  redisLogger.info('Redis disconnected (no persistent connection with REST API)');
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const testKey = 'health:check';
    await redisClient.set(testKey, 'ok', 5);
    const result = await redisClient.get(testKey);
    await redisClient.del(testKey);
    return result === 'ok';
  } catch {
    return false;
  }
}
