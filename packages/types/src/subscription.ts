export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider: SubscriptionProvider | null;
  externalId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  renewedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  UNPAID = 'UNPAID',
}

export enum SubscriptionProvider {
  APPLE = 'APPLE',
  GOOGLE = 'GOOGLE',
}

export interface PlanLimits {
  ideaSessions: number;
  messagesPerSession: number;
  maxTokensPerMessage: number;
  customCategories: boolean;
  prioritySupport: boolean;
  teamCollaboration: boolean;
  apiAccess: boolean;
  exportFormats: string[];
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  [SubscriptionPlan.FREE]: {
    ideaSessions: 1,
    messagesPerSession: 2,
    maxTokensPerMessage: 512,
    customCategories: false,
    prioritySupport: false,
    teamCollaboration: false,
    apiAccess: false,
    exportFormats: ['txt'],
  },
  [SubscriptionPlan.PRO]: {
    ideaSessions: 999999,
    messagesPerSession: 999999,
    maxTokensPerMessage: 2048,
    customCategories: true,
    prioritySupport: true,
    teamCollaboration: false,
    apiAccess: true,
    exportFormats: ['txt', 'pdf', 'md', 'docx'],
  },
  [SubscriptionPlan.ENTERPRISE]: {
    ideaSessions: 999999,
    messagesPerSession: 999999,
    maxTokensPerMessage: 4096,
    customCategories: true,
    prioritySupport: true,
    teamCollaboration: true,
    apiAccess: true,
    exportFormats: ['txt', 'pdf', 'md', 'docx', 'json'],
  },
};
