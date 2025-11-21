export interface IdeaSession {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: IdeaCategory;
  status: IdeaStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum IdeaCategory {
  BUSINESS = 'BUSINESS',
  TECHNOLOGY = 'TECHNOLOGY',
  CREATIVE = 'CREATIVE',
  SOCIAL_IMPACT = 'SOCIAL_IMPACT',
  EDUCATION = 'EDUCATION',
  HEALTH = 'HEALTH',
  ENTERTAINMENT = 'ENTERTAINMENT',
  OTHER = 'OTHER',
}

export enum IdeaStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  COMPLETED = 'COMPLETED',
}

export interface CreateIdeaDTO {
  title: string;
  description: string;
  category: IdeaCategory;
}

export interface IdeaMessage {
  id: string;
  ideaSessionId: string;
  role: MessageRole;
  content: string;
  tokens?: number;
  createdAt: Date;
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export interface SendMessageDTO {
  content: string;
}

export interface IdeaMessageResponse {
  userMessage: IdeaMessage;
  assistantMessage: IdeaMessage;
  remainingReplies: number | null; // null for unlimited (PRO)
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export interface IdeaListItem {
  id: string;
  title: string;
  category: IdeaCategory;
  status: IdeaStatus;
  lastMessageAt: Date;
  messageCount: number;
  createdAt: Date;
}