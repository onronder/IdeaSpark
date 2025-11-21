/**
 * In-App Purchase Service
 * Handles all IAP operations for both iOS and Android
 * NOTE: This is stubbed out for Expo Go compatibility
 */

import Constants from 'expo-constants';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Stub types for Expo Go
type Product = any;
type Purchase = any;
type PurchaseError = any;
type SubscriptionPurchase = any;
type ProductPurchase = any;
type InAppPurchase = any;
type Subscription = any;

// Lazy import react-native-iap only if not in Expo Go
let RNIap: any = null;
if (!isExpoGo) {
  try {
    RNIap = require('react-native-iap');
  } catch (error) {
    console.warn('react-native-iap not available:', error);
  }
}

const {
  initConnection = async () => { console.warn('IAP not available in Expo Go'); return false; },
  endConnection = async () => { console.warn('IAP not available in Expo Go'); },
  getProducts = async () => { console.warn('IAP not available in Expo Go'); return []; },
  getSubscriptions = async () => { console.warn('IAP not available in Expo Go'); return []; },
  requestPurchase = async () => { console.warn('IAP not available in Expo Go'); throw new Error('Not available in Expo Go'); },
  requestSubscription = async () => { console.warn('IAP not available in Expo Go'); throw new Error('Not available in Expo Go'); },
  purchaseUpdatedListener = () => { console.warn('IAP not available in Expo Go'); return { remove: () => {} }; },
  purchaseErrorListener = () => { console.warn('IAP not available in Expo Go'); return { remove: () => {} }; },
  finishTransaction = async () => { console.warn('IAP not available in Expo Go'); },
  getAvailablePurchases = async () => { console.warn('IAP not available in Expo Go'); return []; },
  getPurchaseHistory = async () => { console.warn('IAP not available in Expo Go'); return []; },
  clearTransactionIOS = async () => { console.warn('IAP not available in Expo Go'); },
  clearProductsIOS = async () => { console.warn('IAP not available in Expo Go'); },
  validateReceiptIos = async () => { console.warn('IAP not available in Expo Go'); return {}; },
  acknowledgePurchaseAndroid = async () => { console.warn('IAP not available in Expo Go'); },
  consumePurchaseAndroid = async () => { console.warn('IAP not available in Expo Go'); },
} = RNIap || {};
import { Platform, EmitterSubscription, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProductIds, mapProductToSubscriptionType, mapProductToBillingPeriod, IAP_CONFIG } from '@/config/iapConfig';
import api from '@/lib/api';

// Storage keys
const STORAGE_KEYS = {
  ACTIVE_SUBSCRIPTION: 'iap_active_subscription',
  PURCHASE_HISTORY: 'iap_purchase_history',
  RECEIPT_DATA: 'iap_receipt_data',
};

// Error types
export enum IAPErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  PRODUCTS_NOT_FOUND = 'PRODUCTS_NOT_FOUND',
  PURCHASE_CANCELLED = 'PURCHASE_CANCELLED',
  PURCHASE_FAILED = 'PURCHASE_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RESTORE_FAILED = 'RESTORE_FAILED',
  UNKNOWN = 'UNKNOWN',
}

// Custom error class
export class IAPError extends Error {
  type: IAPErrorType;
  originalError?: any;

  constructor(type: IAPErrorType, message: string, originalError?: any) {
    super(message);
    this.type = type;
    this.originalError = originalError;
    this.name = 'IAPError';
  }
}

// Purchase status
export interface PurchaseStatus {
  isActive: boolean;
  productId?: string;
  expiryDate?: Date;
  billingPeriod?: 'MONTHLY' | 'YEARLY';
  autoRenewing?: boolean;
}

class IAPService {
  private purchaseUpdateSubscription?: EmitterSubscription;
  private purchaseErrorSubscription?: EmitterSubscription;
  private products: Product[] = [];
  private subscriptions: Subscription[] = [];
  private isInitialized = false;
  private pendingPurchases: Purchase[] = [];

  /**
   * Initialize IAP connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('IAP Service already initialized');
      return;
    }

    try {
      console.log('Initializing IAP connection...');

      // Initialize connection to the store
      const result = await initConnection();
      console.log('IAP connection initialized:', result);

      // Clear any cached data on iOS
      if (Platform.OS === 'ios') {
        await clearTransactionIOS();
        await clearProductsIOS();
      }

      // Load products
      await this.loadProducts();

      // Setup purchase listeners
      this.setupPurchaseListeners();

      // Check for pending purchases
      await this.processPendingPurchases();

      this.isInitialized = true;
      console.log('IAP Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
      throw new IAPError(
        IAPErrorType.CONNECTION_FAILED,
        'Failed to connect to the app store',
        error
      );
    }
  }

  /**
   * Load available products from the store
   */
  private async loadProducts(): Promise<void> {
    try {
      const productIds = getProductIds();
      console.log('Loading products:', productIds);

      // Load subscription products
      this.subscriptions = await getSubscriptions({ skus: productIds });
      console.log('Loaded subscriptions:', this.subscriptions);

      // For iOS, we also get regular products
      if (Platform.OS === 'ios') {
        this.products = await getProducts({ skus: productIds });
        console.log('Loaded products:', this.products);
      }

      if (this.subscriptions.length === 0 && this.products.length === 0) {
        throw new IAPError(
          IAPErrorType.PRODUCTS_NOT_FOUND,
          'No products found in the store'
        );
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      throw error;
    }
  }

  /**
   * Setup purchase event listeners
   */
  private setupPurchaseListeners(): void {
    // Purchase update listener
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: InAppPurchase | SubscriptionPurchase) => {
        console.log('Purchase updated:', purchase);

        try {
          // Validate the receipt with our backend
          await this.validateAndProcessPurchase(purchase);
        } catch (error) {
          console.error('Failed to process purchase:', error);
          Alert.alert(
            'Purchase Error',
            'There was an error processing your purchase. Please contact support if the issue persists.'
          );
        }
      }
    );

    // Purchase error listener
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('Purchase error:', error);

        if (error.code === 'E_USER_CANCELLED') {
          // User cancelled, no need to show error
          return;
        }

        Alert.alert(
          'Purchase Failed',
          error.message || 'An error occurred during purchase'
        );
      }
    );
  }

  /**
   * Validate and process a purchase
   */
  private async validateAndProcessPurchase(purchase: Purchase): Promise<void> {
    const { productId, purchaseToken, transactionReceipt, transactionId } = purchase;

    console.log('Validating purchase:', { productId, transactionId });

    try {
      // Send receipt to our backend for validation
      const validationResponse = await api.post('/api/v1/subscriptions/validate-receipt', {
        platform: Platform.OS,
        productId,
        receipt: Platform.OS === 'ios' ? transactionReceipt : purchaseToken,
        transactionId,
      });

      if (validationResponse.data.success) {
        console.log('Purchase validated successfully');

        // Save purchase info locally
        await this.savePurchaseInfo(purchase);

        // Acknowledge/finish the transaction
        await this.finishPurchaseTransaction(purchase);

        // Notify user
        Alert.alert(
          'Success!',
          'Your subscription has been activated. Thank you for upgrading to Pro!'
        );
      } else {
        throw new IAPError(
          IAPErrorType.VALIDATION_FAILED,
          'Receipt validation failed'
        );
      }
    } catch (error) {
      console.error('Purchase validation failed:', error);

      // Still finish the transaction to avoid getting stuck
      await this.finishPurchaseTransaction(purchase);

      throw error;
    }
  }

  /**
   * Finish/acknowledge a purchase transaction
   */
  private async finishPurchaseTransaction(purchase: Purchase): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await finishTransaction({ purchase, isConsumable: false });
      } else {
        await acknowledgePurchaseAndroid({
          purchaseToken: purchase.purchaseToken!,
        });
      }
      console.log('Transaction finished/acknowledged');
    } catch (error) {
      console.error('Failed to finish transaction:', error);
    }
  }

  /**
   * Save purchase information locally
   */
  private async savePurchaseInfo(purchase: Purchase): Promise<void> {
    try {
      const subscriptionInfo = {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        transactionDate: purchase.transactionDate,
        purchaseToken: purchase.purchaseToken,
        platform: Platform.OS,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_SUBSCRIPTION,
        JSON.stringify(subscriptionInfo)
      );

      // Also save to purchase history
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASE_HISTORY);
      const history = historyStr ? JSON.parse(historyStr) : [];
      history.push(subscriptionInfo);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PURCHASE_HISTORY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Failed to save purchase info:', error);
    }
  }

  /**
   * Process any pending purchases
   */
  private async processPendingPurchases(): Promise<void> {
    try {
      const purchases = await getAvailablePurchases();
      console.log('Found pending purchases:', purchases.length);

      for (const purchase of purchases) {
        await this.validateAndProcessPurchase(purchase);
      }
    } catch (error) {
      console.error('Failed to process pending purchases:', error);
    }
  }

  /**
   * Get available subscription products
   */
  getAvailableSubscriptions(): Subscription[] {
    return this.subscriptions;
  }

  /**
   * Get a specific product by ID
   */
  getProduct(productId: string): Product | Subscription | undefined {
    return this.subscriptions.find(s => s.productId === productId) ||
           this.products.find(p => p.productId === productId);
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(productId: string, offerToken?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('Purchasing subscription:', productId);

    try {
      if (Platform.OS === 'ios') {
        await requestSubscription({
          sku: productId,
        });
      } else {
        // Android requires subscription offers
        const subscriptionOffers = this.subscriptions.find(
          s => s.productId === productId
        )?.subscriptionOfferDetails;

        if (!subscriptionOffers || subscriptionOffers.length === 0) {
          throw new IAPError(
            IAPErrorType.PURCHASE_FAILED,
            'No subscription offers available'
          );
        }

        // Use the provided offer token or the first available offer
        const selectedOfferToken = offerToken || subscriptionOffers[0].offerToken;

        await requestSubscription({
          sku: productId,
          subscriptionOffers: [{
            sku: productId,
            offerToken: selectedOfferToken,
          }],
        });
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);

      if (error.code === 'E_USER_CANCELLED') {
        throw new IAPError(
          IAPErrorType.PURCHASE_CANCELLED,
          'Purchase was cancelled',
          error
        );
      }

      throw new IAPError(
        IAPErrorType.PURCHASE_FAILED,
        error.message || 'Purchase failed',
        error
      );
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<PurchaseStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('Restoring purchases...');

    try {
      const purchases = await getAvailablePurchases();
      console.log('Found purchases to restore:', purchases.length);

      if (purchases.length === 0) {
        return { isActive: false };
      }

      // Process each purchase
      for (const purchase of purchases) {
        await this.validateAndProcessPurchase(purchase);
      }

      // Get the latest valid purchase
      const latestPurchase = purchases.sort((a, b) =>
        (b.transactionDate || 0) - (a.transactionDate || 0)
      )[0];

      if (latestPurchase) {
        const subscriptionType = mapProductToSubscriptionType(latestPurchase.productId);
        const billingPeriod = mapProductToBillingPeriod(latestPurchase.productId);

        return {
          isActive: true,
          productId: latestPurchase.productId,
          billingPeriod: billingPeriod || undefined,
        };
      }

      return { isActive: false };
    } catch (error) {
      console.error('Restore purchases failed:', error);
      throw new IAPError(
        IAPErrorType.RESTORE_FAILED,
        'Failed to restore purchases',
        error
      );
    }
  }

  /**
   * Check current subscription status
   */
  async checkSubscriptionStatus(): Promise<PurchaseStatus> {
    try {
      // First check local storage
      const savedSubscription = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION);

      if (!savedSubscription) {
        return { isActive: false };
      }

      const subscriptionInfo = JSON.parse(savedSubscription);

      // Verify with backend
      const response = await api.get('/api/v1/subscriptions/status');

      if (response.data.success) {
        const { subscription } = response.data.data;

        if (subscription && subscription.status === 'ACTIVE') {
          return {
            isActive: true,
            productId: subscriptionInfo.productId,
            expiryDate: subscription.endDate ? new Date(subscription.endDate) : undefined,
            billingPeriod: mapProductToBillingPeriod(subscriptionInfo.productId) || undefined,
            autoRenewing: subscription.autoRenewing,
          };
        }
      }

      return { isActive: false };
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return { isActive: false };
    }
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(): Promise<any[]> {
    try {
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASE_HISTORY);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('Failed to get purchase history:', error);
      return [];
    }
  }

  /**
   * Clear local purchase data (for testing/debugging)
   */
  async clearLocalPurchaseData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION);
      await AsyncStorage.removeItem(STORAGE_KEYS.PURCHASE_HISTORY);
      await AsyncStorage.removeItem(STORAGE_KEYS.RECEIPT_DATA);
      console.log('Local purchase data cleared');
    } catch (error) {
      console.error('Failed to clear local purchase data:', error);
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }

    try {
      await endConnection();
      this.isInitialized = false;
      console.log('IAP Service disconnected');
    } catch (error) {
      console.error('Failed to disconnect IAP:', error);
    }
  }
}

// Export singleton instance
export const iapService = new IAPService();