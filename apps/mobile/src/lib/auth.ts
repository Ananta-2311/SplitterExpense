import * as SecureStore from 'expo-secure-store';
import { ApiClient } from '@expensetracker/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = new ApiClient(API_BASE_URL);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const setTokens = async (access: string, refresh: string) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
  apiClient.setAccessToken(access);
};

export const getAccessToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  apiClient.setAccessToken(null);
};

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await getRefreshToken();
  
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await apiClient.refreshToken(refreshToken);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.accessToken);
    apiClient.setAccessToken(response.data.accessToken);
    return response.data.accessToken;
  } catch (error) {
    await clearTokens();
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAccessToken();
  return token !== null;
};

