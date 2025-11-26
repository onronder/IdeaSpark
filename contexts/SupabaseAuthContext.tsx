import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { logger } from '@/hooks/useLogger';

// User type matching our app schema
interface User {
  id: string;
  email: string;
  name: string | null;
  subscriptionPlan: 'FREE' | 'PRO' | 'ENTERPRISE';
  avatar: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  preferences?: any;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPasswordWithToken: (accessToken: string, newPassword: string) => Promise<void>;
  updateUser: (user: User) => void;
  bootstrap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set logger component name
logger.setComponent('SupabaseAuthContext');

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Fetch user profile from our users table
  const fetchUserProfile = useCallback(async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        logger.error('Error fetching user profile from database', error);
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        subscriptionPlan: data.subscriptionPlan || 'FREE',
        avatar: data.avatar,
        emailVerified: data.emailVerified || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        preferences: data.preferences,
      };
    } catch (error) {
      logger.error('Failed to fetch user profile', error);
      return null;
    }
  }, []);

  // Bootstrap - Check for existing session
  const bootstrap = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user);
        setState({
          user: userProfile,
          session,
          isLoading: false,
          isAuthenticated: !!userProfile,
        });
      } else {
        setState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      logger.error('Bootstrap error - failed to initialize auth session', error);
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [fetchUserProfile]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session?.user) {
        const userProfile = await fetchUserProfile(data.session.user);
        setState({
          user: userProfile,
          session: data.session,
          isLoading: false,
          isAuthenticated: !!userProfile,
        });
      }
    } catch (error: any) {
      logger.error('Sign in failed', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }, [fetchUserProfile]);

  // Sign up
  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || null,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // User profile will be auto-created by database trigger
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // If session is available, fetch the profile
      if (authData.session?.user) {
        const userProfile = await fetchUserProfile(authData.session.user);
        setState({
          user: userProfile,
          session: authData.session,
          isLoading: false,
          isAuthenticated: !!userProfile,
        });
      }
    } catch (error: any) {
      logger.error('Sign up failed', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  }, [fetchUserProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
      router.replace('/(auth)');
    } catch (error) {
      logger.error('Sign out failed', error);
      throw error;
    }
  }, []);

  // Forgot password
  const forgotPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'ideaspark://reset-password',
      });

      if (error) throw error;
    } catch (error: any) {
      logger.error('Forgot password request failed', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  }, []);

  // Change password while authenticated using Supabase Auth
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!state.user) {
        throw new Error('You must be signed in to change your password');
      }

      const email = state.user.email;

      try {
        // Re-authenticate with current password to verify the user
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

        if (reauthError) {
          logger.error('Change password re-authentication failed', reauthError);
          throw new Error('Current password is incorrect');
        }

        // Update password in Supabase
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          logger.error('Change password update failed', updateError);
          throw new Error(updateError.message || 'Failed to change password');
        }

        logger.info('Password changed successfully via Supabase');

        // For security, sign the user out so they must log in with the new password
        await signOut();
      } catch (error: any) {
        logger.error('Change password failed', error);
        throw new Error(error.message || 'Failed to change password');
      }
    },
    [state.user, signOut]
  );

  // Reset password with token
  const resetPasswordWithToken = useCallback(async (accessToken: string, newPassword: string) => {
    try {
      // Set the session using the access token from the reset email
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: accessToken, // For password reset flow, access token is used as refresh token
      });

      if (sessionError) {
        throw new Error(sessionError.message || 'Invalid or expired reset token');
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update password');
      }

      // Sign out after password reset (user must sign in with new password)
      await signOut();
    } catch (error: any) {
      logger.error('Reset password failed', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  }, [signOut]);

  // Update user
  const updateUser = useCallback((user: User) => {
    setState(prev => ({ ...prev, user }));
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info(`Auth state changed: ${event}`, { event, hasSession: !!session });

        if (event === 'SIGNED_IN' && session?.user) {
          const userProfile = await fetchUserProfile(session.user);
          setState({
            user: userProfile,
            session,
            isLoading: false,
            isAuthenticated: !!userProfile,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setState(prev => ({ ...prev, session }));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Bootstrap on mount
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    changePassword,
    resetPasswordWithToken,
    updateUser,
    bootstrap,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
