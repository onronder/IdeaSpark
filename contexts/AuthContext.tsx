import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { router } from 'expo-router';

// Types matching our backend
interface User {
  id: string;
  email: string;
  name: string | null;
  subscriptionPlan: 'FREE' | 'PRO' | 'ENTERPRISE';
  role: 'USER' | 'ADMIN';
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    darkMode?: boolean;
  };
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string, marketingConsent?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateUser: (user: User) => void;
  bootstrap: () => Promise<void>;
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@ideaspark:access_token',
  REFRESH_TOKEN: '@ideaspark:refresh_token',
  USER: '@ideaspark:user',
};

import config from '@/config';

// API base URL from config
const API_BASE_URL = config.apiUrl;

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// JWT decode helper
const decodeToken = (token: string): any => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  // Add 30 second buffer
  return decoded.exp * 1000 < Date.now() + 30000;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Bootstrap - Load stored auth data on app start
  const bootstrap = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const [accessToken, refreshToken, userJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (accessToken && refreshToken && userJson) {
        const user = JSON.parse(userJson) as User;

        // Check if access token is expired
        if (isTokenExpired(accessToken)) {
          // Try to refresh
          await refreshTokens();
        } else {
          setState({
            user,
            tokens: { accessToken, refreshToken },
            isLoading: false,
            isAuthenticated: true,
          });
        }
      } else {
        setState({
          user: null,
          tokens: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Bootstrap error:', error);
      setState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Sign In
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      const { user, accessToken, refreshToken } = data.data;

      // Store tokens and user
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);

      setState({
        user,
        tokens: { accessToken, refreshToken },
        isLoading: false,
        isAuthenticated: true,
      });

      // Navigate to main app
      router.replace('/(app)/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, []);

  // Sign Up
  const signUp = useCallback(async (
    email: string,
    password: string,
    name?: string,
    marketingConsent?: boolean
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          marketingConsent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      const { user, accessToken, refreshToken } = data.data;

      // Store tokens and user
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);

      setState({
        user,
        tokens: { accessToken, refreshToken },
        isLoading: false,
        isAuthenticated: true,
      });

      // Navigate to main app
      router.replace('/(app)/');
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    try {
      // Call logout endpoint if we have tokens
      if (state.tokens?.accessToken) {
        try {
          await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.tokens.accessToken}`,
            },
            body: JSON.stringify({
              refreshToken: state.tokens.refreshToken
            }),
          });
        } catch (error) {
          // Ignore logout endpoint errors - we'll clear local state anyway
          console.warn('Logout endpoint error:', error);
        }
      }

      // Clear storage
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);

      setState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Navigate to auth screen
      router.replace('/(auth)/');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [state.tokens]);

  // Refresh Tokens
  const refreshTokens = useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If refresh fails, clear auth and redirect to login
        await signOut();
        throw new Error(data.error?.message || 'Token refresh failed');
      }

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;

      // Update tokens (with null checks)
      if (!newAccessToken) {
        throw new Error('No access token received');
      }

      const storagePromises = [
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken),
      ];

      // Only store refresh token if provided
      if (newRefreshToken) {
        storagePromises.push(
          AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken)
        );
      }

      await Promise.all(storagePromises);

      setState(prev => ({
        ...prev,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        },
      }));
    } catch (error: any) {
      console.error('Token refresh error:', error);
      // Clear auth state on refresh failure
      await signOut();
      throw error;
    }
  }, [signOut]);

  // Forgot Password
  const forgotPassword = useCallback(async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send reset email');
      }

      return data;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }, []);

  // Reset Password
  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reset password');
      }

      return data;
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  }, []);

  // Update User
  const updateUser = useCallback((user: User) => {
    setState(prev => ({ ...prev, user }));
    AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }, []);

  // Bootstrap on mount
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Context value
  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshTokens,
    forgotPassword,
    resetPassword,
    updateUser,
    bootstrap,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export types
export type { User, AuthTokens, AuthState };