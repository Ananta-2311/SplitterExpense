import { ApiClient } from '@expensetracker/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = new ApiClient(API_BASE_URL);

// Token storage in memory (client-side only)
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  apiClient.setAccessToken(access);
  
  // Store refresh token in http-only cookie via API route
  fetch('/api/auth/set-refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
    credentials: 'include',
  }).catch(console.error);
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  apiClient.setAccessToken(null);
  
  // Clear refresh token cookie
  fetch('/api/auth/clear-refresh-token', {
    method: 'POST',
    credentials: 'include',
  }).catch(console.error);
};

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshToken) {
    // Try to get from cookie
    const response = await fetch('/api/auth/get-refresh-token', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      refreshToken = data.refreshToken;
    }
  }

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await apiClient.refreshToken(refreshToken);
    accessToken = response.data.accessToken;
    apiClient.setAccessToken(accessToken);
    return accessToken;
  } catch (error) {
    clearTokens();
    return null;
  }
};

