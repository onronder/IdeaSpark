import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from '@/lib/api';
import { NotificationPlatform } from '@ideaspark/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationServiceConfig {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

/**
 * Notification Service
 * Handles push notification setup, registration, and handling
 */
class NotificationService {
  private listeners: Array<Notifications.Subscription> = [];
  private config: NotificationServiceConfig = {};
  private isInitialized = false;
  private pushToken: string | null = null;

  /**
   * Initialize the notification service
   */
  async initialize(config?: NotificationServiceConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.config = config || {};

    // Set up notification listeners
    this.setupListeners();

    // Register for push notifications if on physical device
    if (Device.isDevice) {
      await this.registerForPushNotifications();
    } else {
      console.warn('Push notifications require a physical device');
    }

    this.isInitialized = true;
  }

  /**
   * Set up notification event listeners
   */
  private setupListeners(): void {
    // Listener for notifications received while app is in foreground
    const receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        if (this.config.onNotificationReceived) {
          this.config.onNotificationReceived(notification);
        }
      }
    );

    // Listener for user tapping on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        if (this.config.onNotificationResponse) {
          this.config.onNotificationResponse(response);
        }
      }
    );

    this.listeners.push(receivedListener, responseListener);
  }

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if already registered
      const existingToken = await AsyncStorage.getItem('pushToken');
      if (existingToken) {
        this.pushToken = existingToken;
        return existingToken;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission denied');
        return null;
      }

      // Get FCM/APNs push token (for Firebase)
      // If Firebase is configured (GoogleService files present), this will be an FCM token
      // Otherwise, it falls back to Expo Push Token
      let token: string;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Get device push token (FCM for Android, APNs for iOS via Firebase)
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = deviceToken.data;
      } else {
        // Fallback to Expo Push Token for web/other platforms
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id',
        });
        token = tokenData.data;
      }

      this.pushToken = token;

      // Store token locally
      await AsyncStorage.setItem('pushToken', token);

      // Register token with backend
      await this.registerTokenWithBackend(token);

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      console.log('Push notification token:', token);
      return token;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Register push token with backend server
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const platform = Platform.OS === 'ios'
        ? NotificationPlatform.IOS
        : NotificationPlatform.ANDROID;

      const deviceName = Device.modelName || Device.deviceName || 'Unknown Device';
      const deviceId = Constants.deviceId || undefined;

      await api.post('/api/v1/notifications/register', {
        deviceToken: token,
        platform,
        deviceId,
        deviceName,
      });

      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register token with backend:', error);
      throw error;
    }
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // Idea updates channel
    await Notifications.setNotificationChannelAsync('idea_updates', {
      name: 'Idea Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      description: 'Notifications for AI responses and idea updates',
    });

    // Subscription channel
    await Notifications.setNotificationChannelAsync('subscription', {
      name: 'Subscription',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      description: 'Notifications for subscription and billing updates',
    });

    // Marketing channel
    await Notifications.setNotificationChannelAsync('marketing', {
      name: 'Marketing',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Feature announcements and promotional content',
    });
  }

  /**
   * Unregister push token
   */
  async unregister(): Promise<void> {
    try {
      if (this.pushToken) {
        await api.post('/api/v1/notifications/unregister', {
          token: this.pushToken,
        });

        await AsyncStorage.removeItem('pushToken');
        this.pushToken = null;
      }
    } catch (error) {
      console.error('Failed to unregister push token:', error);
      throw error;
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null,
    });
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get all scheduled notifications
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Fetch notifications from backend
   */
  async fetchNotifications(limit = 50, offset = 0) {
    try {
      const response = await api.get('/api/v1/notifications', {
        params: { limit, offset },
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.patch(`/api/v1/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await api.patch('/api/v1/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    this.listeners.forEach((listener) => listener.remove());
    this.listeners = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
