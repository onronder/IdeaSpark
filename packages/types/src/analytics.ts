export interface MarketingAttribution {
  id: string;
  userId: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;
  createdAt: Date;
}

export interface AnalyticsEvent {
  userId: string | null;
  sessionId: string;
  eventName: string;
  eventCategory: EventCategory;
  properties?: Record<string, any>;
  timestamp: Date;
  platform: string;
  appVersion: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export enum EventCategory {
  USER = 'USER',
  IDEA = 'IDEA',
  SUBSCRIPTION = 'SUBSCRIPTION',
  ENGAGEMENT = 'ENGAGEMENT',
  ERROR = 'ERROR',
  PERFORMANCE = 'PERFORMANCE',
}

export interface TrackEventDTO {
  eventName: string;
  properties?: Record<string, any>;
}

export interface UserAnalytics {
  userId: string;
  firstSeen: Date;
  lastSeen: Date;
  totalSessions: number;
  totalEvents: number;
  totalIdeas: number;
  totalMessages: number;
  conversionDate: Date | null;
  churnDate: Date | null;
  lifetimeValue: number;
  acquisitionCost: number;
}

export interface CohortAnalytics {
  cohortId: string;
  cohortName: string;
  cohortDate: Date;
  totalUsers: number;
  activeUsers: number;
  churnedUsers: number;
  retentionRate: number;
  averageLifetimeValue: number;
  averageSessionsPerUser: number;
  averageIdeasPerUser: number;
}

export interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  dropoff: number;
}

export interface ConversionFunnel {
  name: string;
  startDate: Date;
  endDate: Date;
  steps: FunnelStep[];
  totalConversions: number;
  conversionRate: number;
}