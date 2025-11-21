import { Router } from 'express';
import { IdeaController } from '../controllers/idea.controller';
import { validate } from '../middleware/validate';
import { authenticate, requirePlan } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limiter';
import {
  createIdeaSchema,
  updateIdeaSchema,
  getIdeaByIdSchema,
  sendMessageSchema,
  getMessagesSchema,
  listIdeasSchema,
} from '../validation/idea.validation';

const router = Router();

// All idea routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/ideas/usage
 * @desc    Get usage summary
 * @access  Private
 */
router.get('/usage', IdeaController.getUsageSummary);

/**
 * @route   GET /api/v1/ideas
 * @desc    Get user's idea sessions
 * @access  Private
 */
router.get(
  '/',
  validate(listIdeasSchema),
  IdeaController.getUserIdeas
);

/**
 * @route   POST /api/v1/ideas
 * @desc    Create a new idea session
 * @access  Private
 */
router.post(
  '/',
  validate(createIdeaSchema),
  IdeaController.createIdea
);

/**
 * @route   GET /api/v1/ideas/:id
 * @desc    Get idea session by ID
 * @access  Private
 */
router.get(
  '/:id',
  validate(getIdeaByIdSchema),
  IdeaController.getIdeaById
);

/**
 * @route   PATCH /api/v1/ideas/:id
 * @desc    Update idea session
 * @access  Private
 */
router.patch(
  '/:id',
  validate(updateIdeaSchema),
  IdeaController.updateIdea
);

/**
 * @route   GET /api/v1/ideas/:id/messages
 * @desc    Get messages for an idea session
 * @access  Private
 */
router.get(
  '/:id/messages',
  validate(getMessagesSchema),
  IdeaController.getMessages
);

/**
 * @route   POST /api/v1/ideas/:id/messages
 * @desc    Send a message to an idea session
 * @access  Private
 */
router.post(
  '/:id/messages',
  rateLimiter.message, // Apply message rate limiting
  validate(sendMessageSchema),
  IdeaController.sendMessage
);

export { router as ideaRoutes };