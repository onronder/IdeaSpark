import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { parseApiError } from '@/utils/errorHandler';
import { logger } from '@/hooks/useLogger';
import { addBreadcrumb } from '@/sentry.config';
import { supabase } from '@/lib/supabase';

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

import config from '@/config';

// API base URL from config
const API_BASE_URL = config.apiUrl;

class ApiClient {
  private instance: AxiosInstance;

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
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token || null;

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

    // Response interceptor to log errors
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

        return Promise.reject(error);
      }
    );
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

  async delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
export type { ApiError, ApiResponse };
