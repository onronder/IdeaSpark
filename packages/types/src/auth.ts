export interface LoginDTO {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name?: string;
  marketingConsent?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  emailVerified: boolean;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

export interface VerifyEmailDTO {
  token: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}