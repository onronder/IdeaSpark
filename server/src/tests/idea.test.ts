import request from 'supertest';
import { Express } from 'express';
import { IdeaCategory, IdeaStatus, SubscriptionPlan } from '@prisma/client';
import { createTestApp } from './helpers/app.helper';
import {
  createAuthenticatedUser,
  cleanupTestUsers,
  TestUser,
} from './helpers/auth.helper';
import { prisma } from '../utils/database';

describe('Idea Endpoints', () => {
  let app: Express;
  const testUsers: TestUser[] = [];

  beforeAll(() => {
    app = createTestApp();
  });

  afterEach(async () => {
    // Clean up test data
    if (testUsers.length > 0) {
      await cleanupTestUsers(testUsers.map((u) => u.id));
      testUsers.length = 0;
    }
  });

  describe('POST /api/v1/ideas', () => {
    it('should create an idea session successfully', async () => {
      const user = await createAuthenticatedUser({
        email: 'ideas@example.com',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          title: 'My Amazing Idea',
          description: 'This is a detailed description of my amazing idea that will change the world',
          category: IdeaCategory.TECHNOLOGY,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('My Amazing Idea');
      expect(response.body.data.category).toBe(IdeaCategory.TECHNOLOGY);
      expect(response.body.data.status).toBe(IdeaStatus.ACTIVE);
      expect(response.body.data.userId).toBe(user.id);
    });

    it('should enforce FREE plan quota (1 idea)', async () => {
      const user = await createAuthenticatedUser({
        email: 'free@example.com',
        subscriptionPlan: SubscriptionPlan.FREE,
      });
      testUsers.push(user);

      // Create first idea (should succeed)
      const response1 = await request(app)
        .post('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          title: 'First Idea',
          description: 'This is my first idea and it should work fine',
          category: IdeaCategory.BUSINESS,
        });

      expect(response1.status).toBe(201);

      // Try to create second idea (should fail)
      const response2 = await request(app)
        .post('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          title: 'Second Idea',
          description: 'This is my second idea and it should be blocked',
          category: IdeaCategory.BUSINESS,
        });

      expect(response2.status).toBe(403);
      expect(response2.body.error.message).toContain('quota exceeded');
    });

    it('should allow unlimited ideas for PRO plan', async () => {
      const user = await createAuthenticatedUser({
        email: 'pro@example.com',
        subscriptionPlan: SubscriptionPlan.PRO,
      });
      testUsers.push(user);

      // Create multiple ideas
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/v1/ideas')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({
            title: `Pro Idea ${i + 1}`,
            description: `This is pro idea number ${i + 1} with unlimited quota`,
            category: IdeaCategory.BUSINESS,
          });

        expect(response.status).toBe(201);
      }
    });

    it('should validate required fields', async () => {
      const user = await createAuthenticatedUser({
        email: 'validation@example.com',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          title: '', // Empty title
          description: 'short', // Too short
          category: 'INVALID', // Invalid category
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Title is required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ideas')
        .send({
          title: 'Unauthorized Idea',
          description: 'This should fail without authentication',
          category: IdeaCategory.TECHNOLOGY,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('No token provided');
    });
  });

  describe('GET /api/v1/ideas', () => {
    it('should get user ideas successfully', async () => {
      const user = await createAuthenticatedUser({
        email: 'list@example.com',
      });
      testUsers.push(user);

      // Create test ideas
      const idea1 = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'First Idea',
          description: 'First idea description that is long enough',
          category: IdeaCategory.BUSINESS,
          status: IdeaStatus.ACTIVE,
        },
      });

      const idea2 = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Second Idea',
          description: 'Second idea description that is long enough',
          category: IdeaCategory.TECHNOLOGY,
          status: IdeaStatus.COMPLETED,
        },
      });

      const response = await request(app)
        .get('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].id).toBe(idea2.id); // Most recent first
      expect(response.body.data[1].id).toBe(idea1.id);
      expect(response.body.meta.total).toBe(2);
    });

    it('should filter by status', async () => {
      const user = await createAuthenticatedUser({
        email: 'filter@example.com',
      });
      testUsers.push(user);

      // Create ideas with different statuses
      await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Active Idea',
          description: 'Active idea description that is long enough',
          category: IdeaCategory.BUSINESS,
          status: IdeaStatus.ACTIVE,
        },
      });

      await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Completed Idea',
          description: 'Completed idea description that is long enough',
          category: IdeaCategory.TECHNOLOGY,
          status: IdeaStatus.COMPLETED,
        },
      });

      const response = await request(app)
        .get('/api/v1/ideas')
        .query({ status: IdeaStatus.ACTIVE })
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(IdeaStatus.ACTIVE);
    });

    it('should not show other users ideas', async () => {
      const user1 = await createAuthenticatedUser({
        email: 'user1@example.com',
      });
      const user2 = await createAuthenticatedUser({
        email: 'user2@example.com',
      });
      testUsers.push(user1, user2);

      // Create idea for user1
      await prisma.ideaSession.create({
        data: {
          userId: user1.id,
          title: 'User1 Idea',
          description: 'This idea belongs to user1 and should not be visible to user2',
          category: IdeaCategory.BUSINESS,
        },
      });

      // Try to get ideas as user2
      const response = await request(app)
        .get('/api/v1/ideas')
        .set('Authorization', `Bearer ${user2.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/ideas/:id', () => {
    it('should get idea by ID successfully', async () => {
      const user = await createAuthenticatedUser({
        email: 'getbyid@example.com',
      });
      testUsers.push(user);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Get By ID Test',
          description: 'This is a test idea for getting by ID endpoint',
          category: IdeaCategory.EDUCATION,
        },
      });

      const response = await request(app)
        .get(`/api/v1/ideas/${idea.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(idea.id);
      expect(response.body.data.title).toBe('Get By ID Test');
    });

    it('should not allow access to other users ideas', async () => {
      const user1 = await createAuthenticatedUser({
        email: 'owner@example.com',
      });
      const user2 = await createAuthenticatedUser({
        email: 'other@example.com',
      });
      testUsers.push(user1, user2);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user1.id,
          title: 'Private Idea',
          description: 'This idea should only be accessible by its owner',
          category: IdeaCategory.BUSINESS,
        },
      });

      const response = await request(app)
        .get(`/api/v1/ideas/${idea.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Idea session not found');
    });

    it('should handle non-existent idea', async () => {
      const user = await createAuthenticatedUser({
        email: 'notfound@example.com',
      });
      testUsers.push(user);

      const response = await request(app)
        .get('/api/v1/ideas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Idea session not found');
    });
  });

  describe('PATCH /api/v1/ideas/:id', () => {
    it('should update idea successfully', async () => {
      const user = await createAuthenticatedUser({
        email: 'update@example.com',
      });
      testUsers.push(user);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Original Title',
          description: 'Original description that will be updated',
          category: IdeaCategory.BUSINESS,
          status: IdeaStatus.ACTIVE,
        },
      });

      const response = await request(app)
        .patch(`/api/v1/ideas/${idea.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          title: 'Updated Title',
          description: 'This is the updated description for the idea',
          status: IdeaStatus.ARCHIVED,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('This is the updated description for the idea');
      expect(response.body.data.status).toBe(IdeaStatus.ARCHIVED);
      expect(response.body.data.category).toBe(IdeaCategory.BUSINESS); // Unchanged
    });

    it('should not allow updating other users ideas', async () => {
      const user1 = await createAuthenticatedUser({
        email: 'owner@example.com',
      });
      const user2 = await createAuthenticatedUser({
        email: 'attacker@example.com',
      });
      testUsers.push(user1, user2);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user1.id,
          title: 'Protected Idea',
          description: 'This idea should not be updatable by other users',
          category: IdeaCategory.BUSINESS,
        },
      });

      const response = await request(app)
        .patch(`/api/v1/ideas/${idea.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({
          title: 'Hacked Title',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Idea session not found');
    });
  });

  describe('POST /api/v1/ideas/:id/messages', () => {
    it('should send message and receive AI response', async () => {
      const user = await createAuthenticatedUser({
        email: 'messages@example.com',
        subscriptionPlan: SubscriptionPlan.PRO,
      });
      testUsers.push(user);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Message Test',
          description: 'Testing message functionality with AI responses',
          category: IdeaCategory.TECHNOLOGY,
        },
      });

      const response = await request(app)
        .post(`/api/v1/ideas/${idea.id}/messages`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          content: 'How can I improve this technology idea?',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toHaveProperty('id');
      expect(response.body.data.userMessage.content).toBe('How can I improve this technology idea?');
      expect(response.body.data.userMessage.role).toBe('USER');

      expect(response.body.data.assistantMessage).toHaveProperty('id');
      expect(response.body.data.assistantMessage.role).toBe('ASSISTANT');
      expect(response.body.data.assistantMessage.content).toContain('technology'); // Contextual response

      expect(response.body.data.usage).toHaveProperty('totalTokens');
    });

    it('should enforce FREE plan message quota (2 messages)', async () => {
      const user = await createAuthenticatedUser({
        email: 'freemsg@example.com',
        subscriptionPlan: SubscriptionPlan.FREE,
      });
      testUsers.push(user);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Free Plan Test',
          description: 'Testing free plan message quota enforcement',
          category: IdeaCategory.BUSINESS,
        },
      });

      // First message (should succeed)
      const response1 = await request(app)
        .post(`/api/v1/ideas/${idea.id}/messages`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          content: 'First message',
        });

      expect(response1.status).toBe(201);
      expect(response1.body.data.remainingReplies).toBe(1);

      // Second message (should succeed)
      const response2 = await request(app)
        .post(`/api/v1/ideas/${idea.id}/messages`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          content: 'Second message',
        });

      expect(response2.status).toBe(201);
      expect(response2.body.data.remainingReplies).toBe(0);

      // Third message (should fail)
      const response3 = await request(app)
        .post(`/api/v1/ideas/${idea.id}/messages`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          content: 'Third message',
        });

      expect(response3.status).toBe(403);
      expect(response3.body.error.message).toContain('No replies remaining');
    });

    it('should provide contextual responses based on category', async () => {
      const user = await createAuthenticatedUser({
        email: 'context@example.com',
      });
      testUsers.push(user);

      // Test different categories
      const categories = [
        IdeaCategory.BUSINESS,
        IdeaCategory.TECHNOLOGY,
        IdeaCategory.EDUCATION,
      ];

      for (const category of categories) {
        const idea = await prisma.ideaSession.create({
          data: {
            userId: user.id,
            title: `${category} Idea`,
            description: `Testing contextual responses for ${category}`,
            category,
          },
        });

        const response = await request(app)
          .post(`/api/v1/ideas/${idea.id}/messages`)
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({
            content: 'Tell me about this idea',
          });

        expect(response.status).toBe(201);
        expect(response.body.data.assistantMessage.content.toLowerCase()).toContain(
          category.toLowerCase()
        );
      }

      testUsers.push(user);
    });

    it('should be rate limited', async () => {
      const user = await createAuthenticatedUser({
        email: 'ratelimit@example.com',
        subscriptionPlan: SubscriptionPlan.PRO, // Unlimited messages
      });
      testUsers.push(user);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Rate Limit Test',
          description: 'Testing message rate limiting functionality',
          category: IdeaCategory.BUSINESS,
        },
      });

      const promises = [];
      // Try to send 11 messages (rate limit is 10/minute)
      for (let i = 0; i < 11; i++) {
        promises.push(
          request(app)
            .post(`/api/v1/ideas/${idea.id}/messages`)
            .set('Authorization', `Bearer ${user.accessToken}`)
            .send({
              content: `Message ${i + 1}`,
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0]?.body.error.message).toContain('Too many messages');
    });
  });

  describe('GET /api/v1/ideas/:id/messages', () => {
    it('should get messages for an idea', async () => {
      const user = await createAuthenticatedUser({
        email: 'getmsg@example.com',
      });
      testUsers.push(user);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Messages Test',
          description: 'Testing getting messages for an idea session',
          category: IdeaCategory.BUSINESS,
        },
      });

      // Create test messages
      await prisma.ideaMessage.createMany({
        data: [
          {
            ideaSessionId: idea.id,
            content: 'User message 1',
            role: 'USER',
          },
          {
            ideaSessionId: idea.id,
            content: 'Assistant response 1',
            role: 'ASSISTANT',
          },
          {
            ideaSessionId: idea.id,
            content: 'User message 2',
            role: 'USER',
          },
          {
            ideaSessionId: idea.id,
            content: 'Assistant response 2',
            role: 'ASSISTANT',
          },
        ],
      });

      const response = await request(app)
        .get(`/api/v1/ideas/${idea.id}/messages`)
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.data[0].content).toBe('User message 1');
      expect(response.body.data[3].content).toBe('Assistant response 2');
      expect(response.body.meta.total).toBe(4);
    });

    it('should not show messages from other users ideas', async () => {
      const user1 = await createAuthenticatedUser({
        email: 'user1msg@example.com',
      });
      const user2 = await createAuthenticatedUser({
        email: 'user2msg@example.com',
      });
      testUsers.push(user1, user2);

      const idea = await prisma.ideaSession.create({
        data: {
          userId: user1.id,
          title: 'Private Messages',
          description: 'These messages should not be visible to other users',
          category: IdeaCategory.BUSINESS,
        },
      });

      await prisma.ideaMessage.create({
        data: {
          ideaSessionId: idea.id,
          content: 'Private message',
          role: 'USER',
        },
      });

      const response = await request(app)
        .get(`/api/v1/ideas/${idea.id}/messages`)
        .set('Authorization', `Bearer ${user2.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Idea session not found');
    });
  });

  describe('GET /api/v1/ideas/usage', () => {
    it('should get usage summary for FREE plan', async () => {
      const user = await createAuthenticatedUser({
        email: 'freeusage@example.com',
        subscriptionPlan: SubscriptionPlan.FREE,
      });
      testUsers.push(user);

      // Create an idea with some messages
      const idea = await prisma.ideaSession.create({
        data: {
          userId: user.id,
          title: 'Usage Test',
          description: 'Testing usage summary for free plan users',
          category: IdeaCategory.BUSINESS,
        },
      });

      await prisma.ideaMessage.create({
        data: {
          ideaSessionId: idea.id,
          content: 'Test message',
          role: 'USER',
          tokens: 10,
        },
      });

      const response = await request(app)
        .get('/api/v1/ideas/usage')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ideaCount).toBe(1);
      expect(response.body.data.ideaLimit).toBe(1);
      expect(response.body.data.messagesUsed).toBe(1);
      expect(response.body.data.messagesLimit).toBe(2);
      expect(response.body.data.currentPlan).toBe('FREE');
      expect(response.body.data.totalTokensUsed).toBe(10);
    });

    it('should get usage summary for PRO plan', async () => {
      const user = await createAuthenticatedUser({
        email: 'prousage@example.com',
        subscriptionPlan: SubscriptionPlan.PRO,
      });
      testUsers.push(user);

      // Create multiple ideas
      for (let i = 0; i < 3; i++) {
        await prisma.ideaSession.create({
          data: {
            userId: user.id,
            title: `Pro Idea ${i + 1}`,
            description: `Pro idea description number ${i + 1}`,
            category: IdeaCategory.TECHNOLOGY,
          },
        });
      }

      const response = await request(app)
        .get('/api/v1/ideas/usage')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.ideaCount).toBe(3);
      expect(response.body.data.ideaLimit).toBeNull(); // Unlimited
      expect(response.body.data.messagesLimit).toBeNull(); // Unlimited
      expect(response.body.data.currentPlan).toBe('PRO');
    });
  });
});