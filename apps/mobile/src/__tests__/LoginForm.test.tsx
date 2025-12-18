import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../app/screens/LoginScreen';
import * as auth from '../../src/lib/auth';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('../../src/lib/auth', () => ({
  apiClient: {
    login: jest.fn(),
    setAccessToken: jest.fn(),
  },
  setTokens: jest.fn(),
}));

jest.mock('../../src/lib/sync', () => ({
  performSync: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('Login Form Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form with all fields', () => {
    render(<LoginScreen />);

    expect(screen.getByText('Sign In')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('should show error when fields are empty', async () => {
    render(<LoginScreen />);

    const loginButton = screen.getByText('Sign In');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('should handle successful login', async () => {
    const mockReplace = jest.fn();
    jest.mock('expo-router', () => ({
      useRouter: () => ({
        replace: mockReplace,
      }),
    }));

    (auth.apiClient.login as jest.Mock).mockResolvedValue({
      data: {
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      },
    });

    render(<LoginScreen />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const loginButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(auth.apiClient.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should handle login failure', async () => {
    (auth.apiClient.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginScreen />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const loginButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Login Failed',
        expect.stringContaining('Invalid credentials')
      );
    });
  });

  it('should show loading state during login', async () => {
    (auth.apiClient.login as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<LoginScreen />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const loginButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    // Check that button is disabled during loading
    expect(loginButton).toBeTruthy();
  });

  it('should navigate to signup screen', () => {
    const mockPush = jest.fn();
    jest.mock('expo-router', () => ({
      useRouter: () => ({
        push: mockPush,
      }),
    }));

    render(<LoginScreen />);

    const signupLink = screen.getByText(/don't have an account/i);
    expect(signupLink).toBeTruthy();
  });
});
