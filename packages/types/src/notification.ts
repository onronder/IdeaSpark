export interface NotificationToken {
  id: string;
  userId: string;
  token: string;
  platform: NotificationPlatform;
  deviceId: string | null;
  deviceName: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date;
}

export enum NotificationPlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

export interface RegisterPushTokenDTO {
  token: string;
  platform: NotificationPlatform;
  deviceId?: string;
  deviceName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  sentAt: Date;
  readAt: Date | null;
}

export enum NotificationType {
  IDEA_RESPONSE = 'IDEA_RESPONSE',
  QUOTA_WARNING = 'QUOTA_WARNING',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  WELCOME = 'WELCOME',
  FEATURE_ANNOUNCEMENT = 'FEATURE_ANNOUNCEMENT',
  SYSTEM = 'SYSTEM',
}

export interface SendNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export interface NotificationPreferences {
  userId: string;
  ideaResponses: boolean;
  quotaAlerts: boolean;
  subscriptionUpdates: boolean;
  marketingEmails: boolean;
  featureAnnouncements: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursStart: string | null; // HH:mm format
  quietHoursEnd: string | null; // HH:mm format
}