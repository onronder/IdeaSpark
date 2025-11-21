import { Request, Response, NextFunction } from 'express';
import { IdeaService } from '../services/idea.service';
import {
  CreateIdeaInput,
  UpdateIdeaInput,
  SendMessageInput,
  ListIdeasQuery,
} from '../validation/idea.validation';
import { logger } from '../utils/logger';

const ideaLogger = logger.child({ module: 'idea.controller' });

export class IdeaController {
  /**
   * Create a new idea session
   * POST /api/v1/ideas
   */
  static async createIdea(
    req: Request<{}, {}, CreateIdeaInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const ideaSession = await IdeaService.createIdeaSession(
        req.user.id,
        req.body
      );

      res.status(201).json({
        success: true,
        data: ideaSession,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's idea sessions
   * GET /api/v1/ideas
   */
  static async getUserIdeas(
    req: Request<{}, {}, {}, ListIdeasQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const ideas = await IdeaService.getUserIdeaSessions(
        req.user.id,
        req.query?.status
      );

      res.json({
        success: true,
        data: ideas,
        meta: {
          total: ideas.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get idea session by ID
   * GET /api/v1/ideas/:id
   */
  static async getIdeaById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const ideaSession = await IdeaService.getIdeaSession(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        data: ideaSession,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update idea session
   * PATCH /api/v1/ideas/:id
   */
  static async updateIdea(
    req: Request<{ id: string }, {}, UpdateIdeaInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const updated = await IdeaService.updateIdeaSession(
        req.params.id,
        req.user.id,
        req.body
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages for an idea session
   * GET /api/v1/ideas/:id/messages
   */
  static async getMessages(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const messages = await IdeaService.getIdeaMessages(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        data: messages,
        meta: {
          total: messages.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message to an idea session
   * POST /api/v1/ideas/:id/messages
   */
  static async sendMessage(
    req: Request<{ id: string }, {}, SendMessageInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const result = await IdeaService.sendMessage(
        req.params.id,
        req.user.id,
        req.body.content
      );

      res.status(201).json({
        success: true,
        data: {
          userMessage: result.userMessage,
          assistantMessage: result.assistantMessage,
          remainingReplies: result.remainingReplies,
          usage: result.usage || {
            promptTokens: 0,
            completionTokens: result.assistantMessage.tokens || 0,
            totalTokens: result.assistantMessage.tokens || 0,
            estimatedCost: 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get usage summary
   * GET /api/v1/ideas/usage
   */
  static async getUsageSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const summary = await IdeaService.getUsageSummary(req.user.id);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}