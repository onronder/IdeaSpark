import { z } from 'zod';

// Password validation rules
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password must not exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Name validation
const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .trim();

// Register validation
export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema.optional(),
    marketingConsent: z.boolean().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    utmTerm: z.string().optional(),
    utmContent: z.string().optional(),
  }),
});

// Login validation
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    deviceFingerprint: z.string().optional(),
  }),
});

// Refresh token validation
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// Logout validation
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// Forgot password validation
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

// Reset password validation
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
  }),
});

// Change password validation
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];