import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { parseApiError } from '@/utils/errorHandler';
import { logger } from '@/hooks/useLogger';
import { addBreadcrumb } from '@/sentry.config';

// Set logger component
logger.setComponent('ApiClient');

// Types
interface ApiError {
  success: boolean;
  error: {
    message: string;
    type?: string;
    code?: string;
    details?: any;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    type?: string;
    code?: string;
    details?: any;
  };
  meta?: any;
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@ideaspark:access_token',
  REFRESH_TOKEN: '@ideaspark:refresh_token',
};

import config from '@/config';

// API base URL from config
const API_BASE_URL = config.apiUrl;

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log API request
        addBreadcrumb({
          message: `API Request: ${config.method?.toUpperCase()} ${config.url}`,
          category: 'api',
          level: 'debug',
          data: {
            method: config.method,
            url: config.url,
            hasAuth: !!token,
          },
        });

        return config;
      },
      (error: AxiosError) => {
        logger.error('Request setup failed', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.instance.interceptors.response.use(
      (response) => {
        // Log successful response
        addBreadcrumb({
          message: `API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`,
          category: 'api',
          level: 'debug',
          data: {
            status: response.status,
            url: response.config.url,
          },
        });
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log API error
        const parsedError = parseApiError(error);
        logger.warn('API request failed', {
          url: originalRequest?.url,
          method: originalRequest?.method,
          status: error.response?.status,
          error: parsedError,
        });

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.instance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.onRefreshed(newToken);
            logger.info('Token refreshed successfully');

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }

            return this.instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            logger.error('Token refresh failed', refreshError, {
              willRedirect: true,
            });
            await this.clearAuth();
            router.replace('/(auth)/');
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
            this.refreshSubscribers = [];
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      { refreshToken }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error('Token refresh failed');
    }

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;

    // Update stored tokens
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken),
    ]);

    return accessToken;
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token));
  }

  private async clearAuth() {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem('@ideaspark:user'),
    ]);
  }

  // Public methods for API calls
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.patch<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url);
    return response.data;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
export type { ApiError, ApiResponse };