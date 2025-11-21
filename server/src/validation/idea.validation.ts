import { z } from 'zod';
import { IdeaCategory, IdeaStatus } from '@prisma/client';

// Create idea session validation
export const createIdeaSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must not exceed 200 characters')
      .trim(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters')
      .trim(),
    category: z.nativeEnum(IdeaCategory, {
      errorMap: () => ({ message: 'Invalid category' }),
    }),
  }),
});

// Update idea session validation
export const updateIdeaSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid idea ID'),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must not exceed 200 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters')
      .trim()
      .optional(),
    category: z
      .nativeEnum(IdeaCategory, {
        errorMap: () => ({ message: 'Invalid category' }),
      })
      .optional(),
    status: z
      .nativeEnum(IdeaStatus, {
        errorMap: () => ({ message: 'Invalid status' }),
      })
      .optional(),
  }),
});

// Get idea by ID validation
export const getIdeaByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid idea ID'),
  }),
});

// Send message validation
export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid idea ID'),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Message cannot be empty')
      .max(4000, 'Message must not exceed 4000 characters')
      .trim(),
  }),
});

// Get messages validation
export const getMessagesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid idea ID'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }).optional(),
});

// List ideas validation
export const listIdeasSchema = z.object({
  query: z.object({
    status: z.nativeEnum(IdeaStatus).optional(),
    category: z.nativeEnum(IdeaCategory).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).optional(),
});

// Type exports
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>['body'];
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>['body'];
export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];
export type ListIdeasQuery = z.infer<typeof listIdeasSchema>['query'];