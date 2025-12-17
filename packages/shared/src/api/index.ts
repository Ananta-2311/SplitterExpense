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

  // Transaction methods
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    type?: 'income' | 'expense';
    categoryId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    data: {
      transactions: Array<{
        id: string;
        amount: number;
        description: string;
        type: 'income' | 'expense';
        date: string;
        category: {
          id: string;
          name: string;
          color?: string;
        };
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.get(`/api/transactions${query ? `?${query}` : ''}`);
  }

  // Analytics methods
  async getMonthlyAnalytics(months?: number): Promise<{
    success: boolean;
    data: Array<{
      month: string;
      income: number;
      expense: number;
      net: number;
    }>;
  }> {
    const query = months ? `?months=${months}` : '';
    return this.get(`/api/analytics/monthly${query}`);
  }

  async getCategoryAnalytics(months?: number): Promise<{
    success: boolean;
    data: Array<{
      categoryId: string;
      name: string;
      amount: number;
      color?: string;
      count: number;
      percentage: number;
    }>;
  }> {
    const query = months ? `?months=${months}` : '';
    return this.get(`/api/analytics/categories${query}`);
  }

  async getIncomeExpenseAnalytics(months?: number): Promise<{
    success: boolean;
    data: {
      totalIncome: number;
      totalExpense: number;
      net: number;
      monthlyBreakdown: Array<{
        month: string;
        income: number;
        expense: number;
      }>;
    };
  }> {
    const query = months ? `?months=${months}` : '';
    return this.get(`/api/analytics/income-expense${query}`);
  }

  // Recurring expenses methods
  async getRecurringExpenses(): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      amount: number;
      description: string;
      type: string;
      frequency: string;
      startDate: string;
      endDate?: string;
      nextDueDate: string;
      category?: {
        id: string;
        name: string;
        color?: string;
      };
    }>;
  }> {
    return this.get('/api/transactions/recurring');
  }

  async detectRecurringExpenses(): Promise<{
    success: boolean;
    message: string;
    data: Array<{
      id: string;
      amount: number;
      description: string;
      type: string;
      frequency: string;
      startDate: string;
      endDate?: string;
      nextDueDate: string;
      category?: {
        id: string;
        name: string;
        color?: string;
      };
    }>;
  }> {
    return this.post('/api/transactions/recurring/detect');
  }

  // Sync methods
  async syncPull(lastSync?: string): Promise<{
    success: boolean;
    data: {
      transactions: Array<{
        id: string;
        amount: number;
        description: string;
        type: 'income' | 'expense';
        categoryId: string;
        userId: string;
        date: string;
        createdAt: string;
        updatedAt: string;
        category: {
          id: string;
          name: string;
          color?: string;
        };
      }>;
      serverTime: string;
    };
  }> {
    return this.post('/api/sync/pull', { lastSync });
  }

  async syncPush(transactions: Array<{
    id: string;
    amount: number;
    description: string;
    type: 'income' | 'expense';
    categoryId: string;
    date: string;
    updatedAt: string;
  }>): Promise<{
    success: boolean;
    data: {
      created: number;
      updated: number;
      conflicts: number;
      errors: Array<{ id: string; error: string }>;
      serverTime: string;
    };
  }> {
    return this.post('/api/sync/push', { transactions });
  }

  // Export methods
  async exportPdf(data: {
    month: string;
    year: string;
    chartImages: Array<{ type: string; image: string }>;
    summaries?: {
      totalIncome: number;
      totalExpense: number;
      net: number;
    };
  }): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: response.statusText },
      }));
      throw new Error(
        errorData.error?.message || `API Error: ${response.status} ${response.statusText}`
      );
    }

    return response.blob();
  }

  // Settings methods
  async getProfile(): Promise<{
    success: boolean;
    data: {
      id: string;
      email: string;
      name: string;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.get('/api/settings/profile');
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<{
    success: boolean;
    data: {
      id: string;
      email: string;
      name: string;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.put('/api/settings/profile', data);
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.post('/api/settings/password', data);
  }

  async getCategories(): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      userId: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    return this.get('/api/settings/categories');
  }

  async createCategory(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      userId: string;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.post('/api/settings/categories', data);
  }

  async updateCategory(
    id: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
    }
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      userId: string;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.put(`/api/settings/categories/${id}`, data);
  }

  async deleteCategory(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.delete(`/api/settings/categories/${id}`);
  }

  async getPreferences(): Promise<{
    success: boolean;
    data: {
      id: string;
      userId: string;
      aiCategorization: boolean;
      emailNotifications: boolean;
      pushNotifications: boolean;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.get('/api/settings/preferences');
  }

  async updatePreferences(data: {
    aiCategorization?: boolean;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
  }): Promise<{
    success: boolean;
    data: {
      id: string;
      userId: string;
      aiCategorization: boolean;
      emailNotifications: boolean;
      pushNotifications: boolean;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.put('/api/settings/preferences', data);
  }
}

