import { useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { notificationService } from '@/services/notificationService';
import { useAuth } from "@/contexts/SupabaseAuthContext";

interface NotificationData {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  sentAt: string;
  readAt: string | null;
}

interface NotificationsResult {
  notifications: NotificationData[];
  unreadCount: number;
  total: number;
}

export function useNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
  const [lastNotificationResponse, setLastNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize notification service
   */
  useEffect(() => {
    if (!user || isInitialized) {
      return;
    }

    const initialize = async () => {
      try {
        await notificationService.initialize({
          onNotificationReceived: (notification) => {
            setLastNotification(notification);
            // Refresh notifications list
            fetchNotifications();
          },
          onNotificationResponse: (response) => {
            setLastNotificationResponse(response);
            // Handle notification tap - navigate to relevant screen
          handleNotificationTap(response);
          },
        });

        const token = notificationService.getPushToken();
        setPushToken(token);

        const enabled = await notificationService.areNotificationsEnabled();
        setPermissionsGranted(enabled);

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize notifications:', err);
        setError('Failed to initialize notifications');
      }
    };

    initialize();

    return () => {
      notificationService.cleanup();
    };
  }, [user, isInitialized]);

  /**
   * Fetch notifications from backend
   */
  const fetchNotifications = useCallback(async (limit = 50, offset = 0) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: NotificationsResult = await notificationService.fetchNotifications(limit, offset);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);

      // Update badge count
      await notificationService.setBadgeCount(result.unreadCount);
      setBadgeCount(result.unreadCount);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Request notification permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      const granted = await notificationService.requestPermissions();
      setPermissionsGranted(granted);

      if (granted) {
        const token = await notificationService.registerForPushNotifications();
        setPushToken(token);
      }

      return granted;
    } catch (err) {
      console.error('Failed to request permissions:', err);
      setError('Failed to request notification permissions');
      return false;
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );

      // Decrement unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setBadgeCount((prev) => Math.max(0, prev - 1));
      await notificationService.setBadgeCount(Math.max(0, badgeCount - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setError('Failed to mark notification as read');
    }
  }, [badgeCount]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );

      setUnreadCount(0);
      setBadgeCount(0);
      await notificationService.setBadgeCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setError('Failed to mark all notifications as read');
    }
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(async () => {
    try {
      await notificationService.clearAllNotifications();
      setBadgeCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      setError('Failed to clear notifications');
    }
  }, []);

  /**
   * Schedule a local notification
   */
  const scheduleLocalNotification = useCallback(
    async (
      title: string,
      body: string,
      data?: any,
      trigger?: Notifications.NotificationTriggerInput
    ) => {
      try {
        return await notificationService.scheduleNotification(title, body, data, trigger);
      } catch (err) {
        console.error('Failed to schedule notification:', err);
        setError('Failed to schedule notification');
        return null;
      }
    },
    []
  );

  /**
   * Handle notification tap
   */
  const handleNotificationTap = useCallback((response: Notifications.NotificationResponse) => {
    const { notification } = response;
    const data: any = notification.request.content.data || {};
    const type = data.type as string | undefined;

    // IDEA_RESPONSE notifications carry ideaSessionId -> open chat detail
    if (type === 'IDEA_RESPONSE' && data.ideaSessionId) {
      router.push({ pathname: '/(app)/chats/[id]', params: { id: String(data.ideaSessionId) } });
      return;
    }

    // Quota and subscription related notifications -> upgrade screen
    if (
      type === 'QUOTA_EXCEEDED' ||
      type === 'QUOTA_WARNING' ||
      type === 'SUBSCRIPTION_EXPIRING' ||
      type === 'SUBSCRIPTION_RENEWED' ||
      type === 'PAYMENT_FAILED'
    ) {
      router.push('/(app)/upgrade');
      return;
    }

    // Default: go to home tab
    router.push('/(app)');
  }, [router]);

  /**
   * Refresh notifications
   */
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    // State
    isInitialized,
    pushToken,
    permissionsGranted,
    lastNotification,
    lastNotificationResponse,
    notifications,
    unreadCount,
    badgeCount,
    isLoading,
    error,

    // Methods
    requestPermissions,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    scheduleLocalNotification,
    refresh,
  };
}
