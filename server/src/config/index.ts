import { z } from 'zod';
import ms from 'ms';

// Environment schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  // Bcrypt
  BCRYPT_ROUNDS: z.string().default('10').transform(Number),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_MAX_TOKENS: z.string().default('512').transform(Number),
  OPENAI_TEMPERATURE: z.string().default('0.4').transform(Number),
  OPENAI_TIMEOUT: z.string().default('30000').transform(Number),

  // Apple IAP
  APPLE_SHARED_SECRET: z.string().optional(),
  APPLE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // Google Play IAP
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_PACKAGE_NAME: z.string().default('com.ideaspark.app'),

  // Sentry
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_SAMPLE_RATE: z.string().default('1.0').transform(Number),

  // Email
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@ideaspark.app'),
  EMAIL_FROM_NAME: z.string().default('IdeaSpark'),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),

  // Analytics
  AMPLITUDE_API_KEY: z.string().optional(),
  EXPO_PUBLIC_AMPLITUDE_API_KEY: z.string().optional(),

  // Supabase Auth
  SUPABASE_JWT_SECRET: z.string().optional(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:8081'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.string().default('5').transform(Number),
  MESSAGE_RATE_LIMIT_MAX: z.string().default('10').transform(Number),

  // Quotas
  FREE_TIER_IDEA_LIMIT: z.string().default('1').transform(Number),
  FREE_TIER_MESSAGE_LIMIT: z.string().default('2').transform(Number),
  PRO_TIER_IDEA_LIMIT: z.string().default('999999').transform(Number),
  PRO_TIER_MESSAGE_LIMIT: z.string().default('999999').transform(Number),

  // Cost Management
  DAILY_AI_COST_LIMIT: z.string().default('100').transform(Number),
  COST_PER_1K_TOKENS: z.string().default('0.002').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z.string().default('false').transform((val) => val === 'true'),

  // Security
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECURE: z.string().default('false').transform((val) => val === 'true'),
  COOKIE_HTTPONLY: z.string().default('true').transform((val) => val === 'true'),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),

  // Testing
  TEST_DATABASE_URL: z.string().optional(),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Export configuration object
export const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Server
  port: env.PORT,
  host: env.HOST,

  // Database
  databaseUrl: env.NODE_ENV === 'test' ? env.TEST_DATABASE_URL || env.DATABASE_URL : env.DATABASE_URL,

  // Upstash Redis
  redis: {
    restUrl: env.UPSTASH_REDIS_REST_URL,
    restToken: env.UPSTASH_REDIS_REST_TOKEN,
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTokenExpiry: env.JWT_ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: env.JWT_REFRESH_TOKEN_EXPIRY,
    accessTokenExpiryMs: ms(env.JWT_ACCESS_TOKEN_EXPIRY),
    refreshTokenExpiryMs: ms(env.JWT_REFRESH_TOKEN_EXPIRY),
  },

  // Bcrypt
  bcrypt: {
    rounds: env.BCRYPT_ROUNDS,
  },

  // OpenAI
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    maxTokens: env.OPENAI_MAX_TOKENS,
    temperature: env.OPENAI_TEMPERATURE,
    timeout: env.OPENAI_TIMEOUT,
  },

  // In-App Purchases
  iap: {
    apple: {
      sharedSecret: env.APPLE_SHARED_SECRET,
      environment: env.APPLE_ENVIRONMENT,
    },
    google: {
      serviceAccountKey: env.GOOGLE_SERVICE_ACCOUNT_KEY,
      packageName: env.GOOGLE_PACKAGE_NAME,
    },
  },

  // Sentry
  sentry: {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    sampleRate: env.SENTRY_SAMPLE_RATE,
  },

  // Email
  email: {
    sendgridApiKey: env.SENDGRID_API_KEY,
    from: env.EMAIL_FROM,
    fromName: env.EMAIL_FROM_NAME,
  },

  // Firebase
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    privateKey: env.FIREBASE_PRIVATE_KEY,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
  },

  // Analytics
  analytics: {
    // Prefer the Expo-style public key name so the same
    // variable can be used consistently across mobile and backend.
    amplitudeApiKey: env.EXPO_PUBLIC_AMPLITUDE_API_KEY || env.AMPLITUDE_API_KEY,
  },

  // Supabase
  supabase: {
    jwtSecret: env.SUPABASE_JWT_SECRET,
  },

  // CORS
  cors: {
    origins: env.CORS_ORIGINS.split(',').map(origin => origin.trim()),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    loginMaxAttempts: env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    messageMax: env.MESSAGE_RATE_LIMIT_MAX,
  },

  // Quotas
  quotas: {
    free: {
      ideaLimit: env.FREE_TIER_IDEA_LIMIT,
      messageLimit: env.FREE_TIER_MESSAGE_LIMIT,
    },
    pro: {
      ideaLimit: env.PRO_TIER_IDEA_LIMIT,
      messageLimit: env.PRO_TIER_MESSAGE_LIMIT,
    },
  },

  // Cost Management
  costs: {
    dailyAiLimit: env.DAILY_AI_COST_LIMIT,
    per1kTokens: env.COST_PER_1K_TOKENS,
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY,
  },

  // Security
  security: {
    sessionSecret: env.SESSION_SECRET,
    cookieSecure: env.COOKIE_SECURE,
    cookieHttpOnly: env.COOKIE_HTTPONLY,
    cookieSameSite: env.COOKIE_SAMESITE,
  },
} as const;

// Type export
export type Config = typeof config;
