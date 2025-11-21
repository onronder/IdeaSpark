import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  showToast: (params: Omit<ToastMessage, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Individual Toast Component
function Toast({
  toast,
  onHide
}: {
  toast: ToastMessage;
  onHide: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleHide();
      }, toast.duration || 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleHide = () => {
    // Slide out animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: <CheckCircle size={20} color="#16A34A" />,
          titleColor: 'text-green-900',
          messageColor: 'text-green-700',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <AlertCircle size={20} color="#DC2626" />,
          titleColor: 'text-red-900',
          messageColor: 'text-red-700',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: <AlertTriangle size={20} color="#D97706" />,
          titleColor: 'text-yellow-900',
          messageColor: 'text-yellow-700',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: <Info size={20} color="#2563EB" />,
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700',
        };
    }
  };

  const styles = getToastStyles();

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        position: 'absolute',
        top: Platform.OS === 'ios' ? insets.top : insets.top + 10,
        left: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      <View className={`${styles.bg} border ${styles.border} rounded-lg shadow-lg`}>
        <View className="flex-row p-4">
          <View className="mr-3 mt-0.5">{styles.icon}</View>
          <View className="flex-1">
            <Text className={`font-semibold ${styles.titleColor}`}>{toast.title}</Text>
            {toast.message && (
              <Text className={`mt-1 text-sm ${styles.messageColor}`}>{toast.message}</Text>
            )}
            {toast.action && (
              <TouchableOpacity
                onPress={toast.action.onPress}
                className="mt-2"
              >
                <Text className={`text-sm font-medium ${styles.titleColor}`}>
                  {toast.action.label}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleHide} className="ml-2">
            <X size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// Toast Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastCounter = useRef(0);

  const showToast = useCallback((params: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastCounter.current}`;
    const newToast: ToastMessage = {
      id,
      ...params,
    };

    setToasts((prev) => {
      // Limit to 3 toasts max
      const updated = [...prev, newToast];
      if (updated.length > 3) {
        return updated.slice(-3);
      }
      return updated;
    });
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message, duration: 5000 });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  const contextValue: ToastContextValue = {
    showToast,
    hideToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Container */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          pointerEvents: 'box-none',
        }}
      >
        {toasts.map((toast, index) => (
          <View
            key={toast.id}
            style={{
              marginTop: index * 80, // Stack toasts vertically
            }}
          >
            <Toast toast={toast} onHide={hideToast} />
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// Standard user-facing messages
export const ToastMessages = {
  // Auth messages
  AUTH: {
    LOGIN_SUCCESS: { title: 'Welcome back!', message: 'Successfully signed in' },
    SIGNUP_SUCCESS: { title: 'Account created!', message: 'Welcome to IdeaSpark' },
    LOGOUT_SUCCESS: { title: 'Signed out', message: 'See you next time!' },
    SESSION_EXPIRED: { title: 'Session expired', message: 'Please sign in again' },
    PASSWORD_RESET_SENT: { title: 'Email sent', message: 'Check your inbox for reset instructions' },
    PASSWORD_CHANGED: { title: 'Password updated', message: 'Your password has been changed' },
  },

  // Idea messages
  IDEA: {
    CREATE_SUCCESS: { title: 'Idea created!', message: 'Start chatting to refine it' },
    UPDATE_SUCCESS: { title: 'Idea updated', message: 'Your changes have been saved' },
    DELETE_SUCCESS: { title: 'Idea deleted', message: 'Your idea has been removed' },
    QUOTA_WARNING: { title: 'Low quota', message: 'You have limited messages remaining' },
    QUOTA_EXCEEDED: { title: 'Quota exceeded', message: 'Upgrade to Pro for unlimited access' },
  },

  // Profile messages
  PROFILE: {
    UPDATE_SUCCESS: { title: 'Profile updated', message: 'Your changes have been saved' },
    UPDATE_ERROR: { title: 'Update failed', message: 'Could not save your changes' },
  },

  // Network messages
  NETWORK: {
    OFFLINE: { title: 'No connection', message: 'Check your internet connection' },
    SLOW: { title: 'Slow connection', message: 'This might take a moment...' },
    RECONNECTED: { title: 'Back online', message: 'Connection restored' },
  },

  // Generic messages
  GENERIC: {
    SUCCESS: { title: 'Success', message: 'Operation completed successfully' },
    ERROR: { title: 'Error', message: 'Something went wrong. Please try again' },
    LOADING: { title: 'Loading', message: 'Please wait...' },
    SAVED: { title: 'Saved', message: 'Your changes have been saved' },
  },
};