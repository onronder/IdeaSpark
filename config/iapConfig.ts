/**
 * In-App Purchase Configuration
 * Defines product IDs for iOS App Store and Google Play Store
 */

import { Platform } from 'react-native';

// Product IDs must match exactly what's configured in App Store Connect and Google Play Console
export const IAP_PRODUCTS = {
  ios: {
    // iOS product IDs (format: com.ideaspark.app.subscription_type)
    PRO_MONTHLY: 'com.ideaspark.app.pro_monthly',
    PRO_YEARLY: 'com.ideaspark.app.pro_yearly',
  },
  android: {
    // Android product IDs (must match Play Console)
    PRO_MONTHLY: 'pro_monthly_subscription',
    PRO_YEARLY: 'pro_yearly_subscription',
  },
};

// Get platform-specific product IDs
export const getProductIds = () => {
  const products = Platform.OS === 'ios' ? IAP_PRODUCTS.ios : IAP_PRODUCTS.android;
  return Object.values(products);
};

// Get specific product ID by type
export const getProductId = (type: 'PRO_MONTHLY' | 'PRO_YEARLY') => {
  const products = Platform.OS === 'ios' ? IAP_PRODUCTS.ios : IAP_PRODUCTS.android;
  return products[type];
};

// Subscription tiers configuration
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    ideaLimit: 3,
    messagesPerSession: 5,
    features: [
      '3 idea sessions',
      '5 AI replies per session',
      'Basic categories',
      'Standard response time',
    ],
  },
  PRO: {
    name: 'Pro',
    ideaLimit: null, // Unlimited
    messagesPerSession: null, // Unlimited
    features: [
      'Unlimited idea sessions',
      'Unlimited AI replies',
      'All categories',
      'Priority response time',
      'Advanced AI suggestions',
      'Export ideas',
      'Collaboration features',
      'Priority support',
    ],
  },
};

// Pricing display (for UI only, actual prices come from stores)
export const PRICING_DISPLAY = {
  PRO_MONTHLY: {
    displayName: 'Pro Monthly',
    displayPrice: '$9.99/month', // This is just for display, actual price from store
    savings: null,
  },
  PRO_YEARLY: {
    displayName: 'Pro Yearly',
    displayPrice: '$99.99/year', // This is just for display, actual price from store
    savings: 'Save 17%',
  },
};

// Numeric pricing used for analytics/telemetry (must be kept in sync with store pricing)
export const SUBSCRIPTION_PRICES: Record<'PRO_MONTHLY' | 'PRO_YEARLY', number> = {
  PRO_MONTHLY: 9.99,
  PRO_YEARLY: 99.99,
};

// Map store product IDs to our subscription types
export const mapProductToSubscriptionType = (productId: string): 'PRO' | null => {
  const allProducts = [...Object.values(IAP_PRODUCTS.ios), ...Object.values(IAP_PRODUCTS.android)];

  if (allProducts.includes(productId)) {
    return 'PRO';
  }

  return null;
};

// Map store product IDs to billing periods
export const mapProductToBillingPeriod = (productId: string): 'MONTHLY' | 'YEARLY' | null => {
  const monthlyProducts = [IAP_PRODUCTS.ios.PRO_MONTHLY, IAP_PRODUCTS.android.PRO_MONTHLY];
  const yearlyProducts = [IAP_PRODUCTS.ios.PRO_YEARLY, IAP_PRODUCTS.android.PRO_YEARLY];

  if (monthlyProducts.includes(productId)) {
    return 'MONTHLY';
  }

  if (yearlyProducts.includes(productId)) {
    return 'YEARLY';
  }

  return null;
};

// Environment configuration
export const IAP_CONFIG = {
  // Enable sandbox mode for testing
  sandbox: __DEV__,

  // Auto-finish transactions (set to false if you want to manually finish)
  autoFinishTransactions: true,

  // Enable debug logs
  debug: __DEV__,
};
