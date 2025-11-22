import Constants from 'expo-constants';

// Get environment from Expo constants
const ENV = Constants.expoConfig?.extra?.env || 'development';

// API URLs for different environments
const API_URLS = {
  development: 'https://ideaspark-production.up.railway.app',
  staging: 'https://api-staging.ideaspark.com',
  production: 'https://api.ideaspark.com',
};

// Configuration object
export const config = {
  env: ENV,
  apiUrl: API_URLS[ENV as keyof typeof API_URLS] || API_URLS.development,
  apiVersion: 'v1',

  // App configuration
  app: {
    name: 'IdeaSpark',
    version: Constants.expoConfig?.version || '1.0.0',
    sentryDsn: Constants.expoConfig?.extra?.sentryDsn,
  },

  // Feature flags
  features: {
    enableAnalytics: ENV === 'production',
    enableSentry: ENV !== 'development',
    enableDevTools: ENV === 'development',
  },

  // Plan limits (should match backend)
  plans: {
    FREE: {
      maxIdeas: 1,
      maxMessagesPerIdea: 2,
      name: 'Free',
    },
    PRO: {
      maxIdeas: null, // Unlimited
      maxMessagesPerIdea: null, // Unlimited
      name: 'Pro',
    },
    ENTERPRISE: {
      maxIdeas: null,
      maxMessagesPerIdea: null,
      name: 'Enterprise',
    },
  },
};

export default config;
