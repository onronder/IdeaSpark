import { z } from 'zod';

// Update profile schema
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email().optional(),
    preferences: z.any().optional(), // Can be more specific based on preferences structure
  }),
});

// Change password schema
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

// Delete account schema
export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
});

// Update notification preferences schema
export const updateNotificationPreferencesSchema = z.object({
  body: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    ideaUpdates: z.boolean().optional(),
    marketing: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
  }),
});

// Update theme preference schema
export const updateThemePreferenceSchema = z.object({
  body: z.object({
    theme: z.enum(['light', 'dark', 'system']),
  }),
});

// Get audit history schema
export const getAuditHistorySchema = z.object({
  query: z.object({
    limit: z.string().transform(Number).optional(),
  }),
});
