import { z } from 'zod';
import { NotificationPlatform, NotificationType } from '@prisma/client';

// Register push token schema
export const registerTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Push token is required'),
    platform: z.nativeEnum(NotificationPlatform, {
      errorMap: () => ({ message: 'Platform must be IOS, ANDROID, or WEB' }),
    }),
    deviceId: z.string().optional(),
    deviceName: z.string().optional(),
  }),
});

// Unregister push token schema
export const unregisterTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Push token is required'),
  }),
});

// Get notifications schema
export const getNotificationsSchema = z.object({
  query: z.object({
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
    offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
  }),
});

// Mark notification as read schema
export const markAsReadSchema = z.object({
  params: z.object({
    notificationId: z.string().uuid('Invalid notification ID'),
  }),
});

// Test notification schema
export const testNotificationSchema = z.object({
  body: z.object({
    type: z.nativeEnum(NotificationType, {
      errorMap: () => ({ message: 'Invalid notification type' }),
    }).optional(),
    data: z.record(z.any()).optional(),
  }),
});
