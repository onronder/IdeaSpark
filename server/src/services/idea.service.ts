import { IdeaSession, IdeaMessage, IdeaCategory, IdeaStatus, MessageRole, SubscriptionPlan } from '@prisma/client';
import { prisma } from '../utils/database';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { cache } from '../utils/redis';
import { config } from '../config';
import {
  generateCompletion,
  calculateTokenCost,
  buildIdeaSparkSystemPrompt,
} from './openaiClient';
import { NotificationService } from './notification.service';

const ideaLogger = logger.child({ module: 'idea.service' });

// Plan limits
const PLAN_LIMITS = {
  FREE: {
    ideaSessions: config.quotas.free.ideaLimit,
    messagesPerSession: config.quotas.free.messageLimit,
  },
  PRO: {
    ideaSessions: config.quotas.pro.ideaLimit,
    messagesPerSession: config.quotas.pro.messageLimit,
  },
  ENTERPRISE: {
    ideaSessions: 999999,
    messagesPerSession: 999999,
  },
};

export class IdeaService {
  /**
   * Create a new idea session
   */
  static async createIdeaSession(
    userId: string,
    data: {
      title: string;
      description: string;
      category: IdeaCategory;
    }
  ): Promise<IdeaSession> {
    // Check user's subscription and quota
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: true,
        ideaSessions: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get active subscription or fall back to subscriptionPlan field
    const activeSubscription = user.subscriptions?.find(s => s.status === 'ACTIVE');
    const userPlan = activeSubscription?.plan || user.subscriptionPlan;
    const limits = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS];
    const activeSessionCount = user.ideaSessions.length;

    // Check idea session limit
    if (activeSessionCount >= limits.ideaSessions) {
      throw new ApiError(
        402,
        `You have reached the limit of ${limits.ideaSessions} idea session(s) for your ${userPlan} plan`,
        'IDEA_LIMIT_EXCEEDED',
        { limit: limits.ideaSessions, current: activeSessionCount }
      );
    }

    // Create idea session
    const ideaSession = await prisma.ideaSession.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        category: data.category,
        status: 'ACTIVE',
      },
    });

    ideaLogger.info(
      { userId, ideaSessionId: ideaSession.id },
      'Idea session created'
    );

    return ideaSession;
  }

  /**
   * Get user's idea sessions
   */
  static async getUserIdeaSessions(
    userId: string,
    status?: IdeaStatus
  ): Promise<IdeaSession[]> {
    return prisma.ideaSession.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get idea session by ID
   */
  static async getIdeaSession(
    ideaSessionId: string,
    userId: string
  ): Promise<IdeaSession> {
    const ideaSession = await prisma.ideaSession.findUnique({
      where: { id: ideaSessionId },
    });

    if (!ideaSession) {
      throw new ApiError(404, 'Idea session not found', 'IDEA_NOT_FOUND');
    }

    if (ideaSession.userId !== userId) {
      throw new ApiError(403, 'Access denied', 'ACCESS_DENIED');
    }

    return ideaSession;
  }

  /**
   * Update idea session
   */
  static async updateIdeaSession(
    ideaSessionId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      category?: IdeaCategory;
      status?: IdeaStatus;
    }
  ): Promise<IdeaSession> {
    // Verify ownership
    await this.getIdeaSession(ideaSessionId, userId);

    const updated = await prisma.ideaSession.update({
      where: { id: ideaSessionId },
      data: {
        ...data,
        ...(data.status === 'ARCHIVED' && { archivedAt: new Date() }),
      },
    });

    ideaLogger.info(
      { userId, ideaSessionId },
      'Idea session updated'
    );

    return updated;
  }

  /**
   * Get messages for an idea session
   */
  static async getIdeaMessages(
    ideaSessionId: string,
    userId: string
  ): Promise<IdeaMessage[]> {
    // Verify ownership
    await this.getIdeaSession(ideaSessionId, userId);

    return prisma.ideaMessage.findMany({
      where: { ideaSessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Send a message to an idea session with OpenAI integration
   */
  static async sendMessage(
    ideaSessionId: string,
    userId: string,
    content: string
  ): Promise<{
    userMessage: IdeaMessage;
    assistantMessage: IdeaMessage;
    remainingReplies: number | null;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
  }> {
    // Verify ownership
    const ideaSession = await this.getIdeaSession(ideaSessionId, userId);

    // Check user's subscription and message quota
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    });

    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get active subscription or fall back to subscriptionPlan field
    const activeSubscription = user.subscriptions?.find(s => s.status === 'ACTIVE');
    const userPlan = activeSubscription?.plan || user.subscriptionPlan;
    const limits = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS];

    // Count existing messages in this session
    const messageCount = await prisma.ideaMessage.count({
      where: {
        ideaSessionId,
        role: 'USER',
      },
    });

    // Check message limit
    if (messageCount >= limits.messagesPerSession) {
      throw new ApiError(
        402,
        `You have reached the limit of ${limits.messagesPerSession} messages for your ${userPlan} plan`,
        'MESSAGE_LIMIT_EXCEEDED',
        { limit: limits.messagesPerSession, current: messageCount }
      );
    }

    // Create user message
    const userMessage = await prisma.ideaMessage.create({
      data: {
        ideaSessionId,
        role: 'USER',
        content,
      },
    });

    // Fetch session history for context (limit to last N messages)
    const messageHistory = await prisma.ideaMessage.findMany({
      where: { ideaSessionId },
      orderBy: { createdAt: 'asc' },
      take: 10, // Last 10 messages for context window
    });

    // Build context for OpenAI
    const contextPrompt = this.buildContextPrompt(ideaSession, messageHistory);

    // Check cache for similar prompts (Redis)
    const cacheKey = `openai:${userId}:${Buffer.from(contextPrompt + content).toString('base64').substring(0, 64)}`;
    const cachedResponse = await cache.get(cacheKey);

    let aiResponse;
    let usage;
    let cached = false;

    if (cachedResponse) {
      // Use cached response
      aiResponse = JSON.parse(cachedResponse);
      cached = true;
      ideaLogger.info({ ideaSessionId, cacheKey }, 'Using cached OpenAI response');
    } else {
      // Call OpenAI API
      const startTime = Date.now();

      try {
        const systemPrompt = buildIdeaSparkSystemPrompt();
        const openaiResponse = await generateCompletion(
          contextPrompt + '\n\nUser: ' + content,
          systemPrompt,
          {
            user: userId,
            maxTokens: 512,
            temperature: 0.7,
          }
        );

        aiResponse = {
          content: openaiResponse.content,
          tokens: openaiResponse.usage.completionTokens,
        };

        usage = openaiResponse.usage;
        const latencyMs = Date.now() - startTime;

        // Cache the response for 1 hour
        await cache.set(cacheKey, JSON.stringify(aiResponse), 3600);

        // Log AI usage
        const costUsd = calculateTokenCost(usage, openaiResponse.model);
        await prisma.aIUsageLog.create({
          data: {
            userId,
            ideaSessionId,
            ideaMessageId: userMessage.id,
            model: openaiResponse.model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            costUsd,
            latencyMs,
            cached: false,
          },
        });

        ideaLogger.info({
          ideaSessionId,
          model: openaiResponse.model,
          tokens: usage.totalTokens,
          cost: costUsd,
          latency: latencyMs,
        }, 'OpenAI response generated');
      } catch (error) {
        ideaLogger.error({ err: error }, 'OpenAI API call failed, falling back to stubbed response');

        // Fallback to stubbed response if OpenAI fails
        aiResponse = await this.generateStubbedAIResponse(ideaSession, content);
      }
    }

    // Create assistant message
    const assistantMessage = await prisma.ideaMessage.create({
      data: {
        ideaSessionId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        tokens: aiResponse.tokens,
      },
    });

    ideaLogger.info(
      { userId, ideaSessionId, messageId: userMessage.id, cached },
      'Message sent with AI response'
    );

    // Send notification for AI response ready
    try {
      await NotificationService.notifyAIResponseReady(userId, ideaSessionId, ideaSession.title);
    } catch (error) {
      ideaLogger.error({ err: error }, 'Failed to send notification');
      // Don't fail the request if notification fails
    }

    // Calculate remaining replies
    const remainingReplies = userPlan === 'FREE'
      ? limits.messagesPerSession - messageCount - 1
      : null;

    // Send quota warning if low on messages
    if (remainingReplies !== null && remainingReplies > 0 && remainingReplies <= 5) {
      try {
        await NotificationService.notifyQuotaWarning(userId, remainingReplies);
      } catch (error) {
        ideaLogger.error({ err: error }, 'Failed to send quota warning');
      }
    }

    // Send quota exceeded notification if no more messages
    if (remainingReplies === 0) {
      try {
        await NotificationService.notifyQuotaExceeded(userId);
      } catch (error) {
        ideaLogger.error({ err: error }, 'Failed to send quota exceeded notification');
      }
    }

    return {
      userMessage,
      assistantMessage,
      remainingReplies,
      ...(usage && {
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCost: calculateTokenCost(usage),
        },
      }),
    };
  }

  /**
   * Build context prompt from session history
   */
  private static buildContextPrompt(
    ideaSession: IdeaSession,
    messageHistory: IdeaMessage[]
  ): string {
    let contextPrompt = `Idea Session: ${ideaSession.title}\n`;
    contextPrompt += `Category: ${ideaSession.category}\n`;
    contextPrompt += `Description: ${ideaSession.description}\n\n`;

    if (messageHistory.length > 0) {
      contextPrompt += 'Previous conversation:\n';
      messageHistory.forEach((msg) => {
        const role = msg.role === 'USER' ? 'User' : 'Assistant';
        contextPrompt += `${role}: ${msg.content}\n`;
      });
    }

    return contextPrompt;
  }

  /**
   * Generate stubbed AI response (fallback when OpenAI is unavailable)
   */
  private static async generateStubbedAIResponse(
    ideaSession: IdeaSession,
    userMessage: string
  ): Promise<{ content: string; tokens: number }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate different responses based on category and message content
    const responses = {
      BUSINESS: [
        "That's an interesting business idea! Let me help you refine it. Have you considered the target market and revenue model?",
        "Great thinking! For this business concept, you might want to explore customer acquisition strategies and competitive analysis.",
        "Excellent point! Let's dive deeper into the value proposition and potential market size.",
      ],
      TECHNOLOGY: [
        "That's a fascinating tech concept! What technologies are you planning to use for implementation?",
        "Interesting approach! Have you considered the scalability and technical challenges?",
        "Great technical insight! Let's explore the architecture and potential integrations.",
      ],
      CREATIVE: [
        "What a creative idea! Let's explore the artistic vision and audience appeal.",
        "That's wonderfully imaginative! How do you envision bringing this creative concept to life?",
        "Brilliant creative thinking! Let's discuss the aesthetic choices and emotional impact.",
      ],
      SOCIAL_IMPACT: [
        "That's a meaningful initiative! Let's explore the potential social impact and beneficiaries.",
        "Wonderful cause! Have you thought about partnerships and community engagement?",
        "Great social vision! Let's discuss sustainability and measuring impact.",
      ],
      EDUCATION: [
        "Excellent educational concept! Let's explore the learning outcomes and target audience.",
        "That's a valuable learning approach! How would you structure the curriculum?",
        "Great educational insight! Let's discuss engagement strategies and assessment methods.",
      ],
      HEALTH: [
        "Important health focus! Let's explore the potential benefits and target demographics.",
        "That's a valuable health initiative! Have you considered regulatory requirements?",
        "Great health concept! Let's discuss implementation and user adoption strategies.",
      ],
      ENTERTAINMENT: [
        "Exciting entertainment idea! Let's explore the audience and distribution channels.",
        "That sounds fun! How would you differentiate this from existing entertainment options?",
        "Creative entertainment concept! Let's discuss production requirements and monetization.",
      ],
      OTHER: [
        "Interesting concept! Let me help you develop this idea further.",
        "That's a unique approach! What inspired this idea?",
        "Great thinking! Let's explore the potential opportunities and challenges.",
      ],
    };

    const categoryResponses = responses[ideaSession.category] || responses.OTHER;
    const randomResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

    // Add personalized elements based on the user's message
    const personalizedResponse = `${randomResponse}\n\nBased on what you said: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}", I think we should focus on defining clear objectives and actionable next steps.`;

    return {
      content: personalizedResponse,
      tokens: Math.floor(personalizedResponse.length / 4), // Rough token estimate
    };
  }

  /**
   * Get usage summary for a user
   */
  static async getUsageSummary(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    remainingSessions: number | null;
    remainingMessages: number | null;
    plan: SubscriptionPlan;
    monthlyTokenUsage: number;
    monthlyEstimatedCost: number;
    dailyTokenUsage: number;
    dailyEstimatedCost: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: true,
        ideaSessions: true,
        _count: {
          select: {
            ideaSessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get active subscription or fall back to subscriptionPlan field
    const activeSubscription = user.subscriptions?.find(s => s.status === 'ACTIVE');
    const userPlan = activeSubscription?.plan || user.subscriptionPlan;
    const limits = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS];

    const activeSessions = user.ideaSessions.filter(s => s.status === 'ACTIVE').length;
    const totalMessages = await prisma.ideaMessage.count({
      where: {
        ideaSession: {
          userId,
        },
        role: 'USER',
      },
    });

    // Get current date boundaries
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate monthly AI usage
    const monthlyUsage = await prisma.aIUsageLog.aggregate({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        totalTokens: true,
        costUsd: true,
      },
    });

    // Aggregate daily AI usage
    const dailyUsage = await prisma.aIUsageLog.aggregate({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
        },
      },
      _sum: {
        totalTokens: true,
        costUsd: true,
      },
    });

    return {
      totalSessions: user._count.ideaSessions,
      activeSessions,
      totalMessages,
      remainingSessions: userPlan === 'FREE' ? limits.ideaSessions - activeSessions : null,
      remainingMessages: userPlan === 'FREE' ? limits.messagesPerSession : null,
      plan: userPlan as SubscriptionPlan,
      monthlyTokenUsage: monthlyUsage._sum.totalTokens || 0,
      monthlyEstimatedCost: monthlyUsage._sum.costUsd || 0,
      dailyTokenUsage: dailyUsage._sum.totalTokens || 0,
      dailyEstimatedCost: dailyUsage._sum.costUsd || 0,
    };
  }
}