import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colorMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const { user } = useAuth();
  const { handleError, logger } = useErrorHandler('ThemeContext');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from user preferences or system
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // First check user preferences if logged in
        if (user?.preferences?.darkMode !== undefined) {
          setIsDarkMode(user.preferences.darkMode);
          logger.info('Theme initialized from user preferences', {
            darkMode: user.preferences.darkMode
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
  }, [user, systemColorScheme]);

  const toggleDarkMode = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);

      // Save to local storage
      await AsyncStorage.setItem('theme_preference', newMode ? 'dark' : 'light');

      // TODO: Update user preferences on server when API is available
      if (user) {
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