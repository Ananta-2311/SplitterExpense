import type { CategorizationResponse } from '../types/categories';

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
}

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: response.statusText },
      }));
      throw new Error(
        errorData.error?.message || `API Error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/auth/register', {
      email,
      password,
      name,
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
  }

  async logout(refreshToken: string): Promise<{ success: boolean; message: string }> {
    return this.post('/api/auth/logout', { refreshToken });
  }

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    return this.post<RefreshResponse>('/api/auth/refresh', { refreshToken });
  }

  // Categorization methods
  async categorizeTransaction(
    text: string,
    useAI?: boolean
  ): Promise<CategorizationResponse> {
    return this.post<CategorizationResponse>('/api/categorize', {
      text,
      useAI,
    });
  }
}

