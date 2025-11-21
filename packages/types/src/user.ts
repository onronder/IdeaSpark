import { SubscriptionPlan } from './subscription';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: SubscriptionPlan;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}


export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: SubscriptionPlan;
  emailNotifications: boolean;
  pushNotifications: boolean;
  darkMode: boolean;
  language: string;
  timezone: string;
}

export interface UpdateUserProfileDTO {
  name?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  darkMode?: boolean;
  language?: string;
  timezone?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountDTO {
  password: string;
  reason?: string;
  feedback?: string;
}