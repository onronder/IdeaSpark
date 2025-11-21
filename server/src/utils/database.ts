import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from './logger';

// Create singleton Prisma client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: config.isDevelopment
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
    errorFormat: config.isDevelopment ? 'pretty' : 'minimal',
  });

if (!config.isProduction) globalForPrisma.prisma = prisma;

// Connect to database
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    throw error;
  }
}

// Disconnect from database
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to disconnect from database');
    throw error;
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}