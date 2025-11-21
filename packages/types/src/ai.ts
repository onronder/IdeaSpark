export interface AIUsageLog {
  id: string;
  userId: string;
  ideaSessionId: string | null;
  ideaMessageId: string | null;
  model: AIModel;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  cached: boolean;
  createdAt: Date;
}

export enum AIModel {
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O = 'gpt-4o',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_35_TURBO = 'gpt-3.5-turbo',
}

export interface AIModelConfig {
  model: AIModel;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface UsageSummary {
  userId: string;
  period: UsagePeriod;
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCostUsd: number;
  remainingSessions: number | null; // null for unlimited
  remainingMessages: number | null; // null for unlimited
  averageLatencyMs: number;
  cacheHitRate: number;
}

export enum UsagePeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME',
}

export interface AIQuota {
  userId: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  usedSessions: number;
  maxSessions: number | null;
  usedMessages: number;
  maxMessages: number | null;
  usedTokens: number;
  maxTokens: number | null;
  resetAt: Date | null;
}

export interface AIError {
  code: AIErrorCode;
  message: string;
  details?: any;
}

export enum AIErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_PROMPT = 'INVALID_PROMPT',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
}