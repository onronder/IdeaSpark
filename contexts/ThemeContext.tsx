import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './SupabaseAuthContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useUpdateTheme } from '@/hooks/useApi';

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  colorMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const { user } = useAuth();
  const { handleError, logger } = useErrorHandler('ThemeContext');
  const updateTheme = useUpdateTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from user preferences or system
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // First check user preferences if logged in
        if (user?.preferences && typeof (user.preferences as any).theme === 'string') {
          const userTheme = (user.preferences as any).theme;
          if (userTheme === 'dark') {
            setIsDarkMode(true);
          } else if (userTheme === 'light') {
            setIsDarkMode(false);
          } else if (userTheme === 'system') {
            setIsDarkMode(systemColorScheme === 'dark');
          }
          logger.info('Theme initialized from user preferences', {
            theme: userTheme,
            isDarkMode: userTheme === 'dark' || (userTheme === 'system' && systemColorScheme === 'dark')
          });
        } else {
          // Otherwise check local storage
          const storedTheme = await AsyncStorage.getItem('theme_preference');
          if (storedTheme) {
            const isDark = storedTheme === 'dark';
            setIsDarkMode(isDark);
            logger.info('Theme initialized from local storage', {
              darkMode: isDark
            });
          } else {
            // Fall back to system preference
            const systemIsDark = systemColorScheme === 'dark';
            setIsDarkMode(systemIsDark);
            logger.info('Theme initialized from system preference', {
              darkMode: systemIsDark
            });
          }
        }
      } catch (error) {
        handleError(error, 'Failed to initialize theme');
        // Default to light mode on error
        setIsDarkMode(false);
      }
    };

    initializeTheme();
  }, [user?.id, systemColorScheme]);

  const toggleDarkMode = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);

      // Save to local storage
      await AsyncStorage.setItem('theme_preference', newMode ? 'dark' : 'light');

      // Update user preferences on server
      if (user) {
        await updateTheme.mutateAsync(newMode ? 'dark' : 'light');
        logger.logUserAction('dark_mode_toggled', {
          newMode: newMode ? 'dark' : 'light',
          userId: user.id
        });
      }

      logger.info('Theme toggled', { darkMode: newMode });
    } catch (error) {
      handleError(error, 'Failed to toggle dark mode');
      // Revert on error
      setIsDarkMode(isDarkMode);
    }
  };

  const value: ThemeContextValue = {
    isDarkMode,
    toggleDarkMode,
    colorMode: isDarkMode ? 'dark' : 'light',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
