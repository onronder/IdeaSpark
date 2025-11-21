import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, SubscriptionPlan } from '@prisma/client';
import { prisma } from '../../utils/database';

export interface TestUser extends User {
  plainPassword?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Create a test user with optional custom properties
 */
export async function createTestUser(
  overrides: Partial<User> & { plainPassword?: string } = {}
): Promise<TestUser> {
  const plainPassword = overrides.plainPassword || 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: overrides.email || `test${Date.now()}@example.com`,
      passwordHash: hashedPassword,
      name: overrides.name || 'Test User',
      emailVerified: overrides.emailVerified ?? true,
      subscriptionPlan: overrides.subscriptionPlan || SubscriptionPlan.FREE,
    },
  });

  return {
    ...user,
    plainPassword,
  };
}

/**
 * Generate JWT tokens for a test user
 */
export function generateTestTokens(user: User): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: 'access',
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key',
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: 'refresh',
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Create an authenticated test user with tokens
 */
export async function createAuthenticatedUser(
  overrides: Partial<User> & { plainPassword?: string } = {}
): Promise<TestUser> {
  const user = await createTestUser(overrides);
  const { accessToken, refreshToken } = generateTestTokens(user);

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return {
    ...user,
    accessToken,
    refreshToken,
  };
}

/**
 * Clean up test users
 */
export async function cleanupTestUsers(userIds: string[]): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId: { in: userIds } },
  });

  await prisma.ideaMessage.deleteMany({
    where: { ideaSession: { userId: { in: userIds } } },
  });

  await prisma.ideaSession.deleteMany({
    where: { userId: { in: userIds } },
  });

  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
}