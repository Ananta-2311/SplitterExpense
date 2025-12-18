import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from '../../src/lib/useTheme';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Appearance
const mockGetColorScheme = jest.fn(() => 'light');
const mockAddChangeListener = jest.fn(() => ({ remove: jest.fn() }));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Appearance: {
      getColorScheme: mockGetColorScheme,
      addChangeListener: mockAddChangeListener,
    },
  };
});

// Test component that uses theme
const TestComponent = () => {
  const { isDark, colors, toggleTheme } = useTheme();

  return (
    <>
      <Text testID="is-dark">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="background-color">{colors.background}</Text>
      <TouchableOpacity testID="toggle-theme" onPress={toggleTheme}>
        <Text>Toggle Theme</Text>
      </TouchableOpacity>
    </>
  );
};

describe('Theme Switching Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue(null);
  });

  it('should initialize with system theme', async () => {
    mockGetColorScheme.mockReturnValue('light');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-dark')).toHaveTextContent('light');
    });
  });

  it('should switch to dark theme when system theme is dark', async () => {
    mockGetColorScheme.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-dark')).toHaveTextContent('dark');
    });
  });

  it('should toggle theme manually', async () => {
    mockGetColorScheme.mockReturnValue('light');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-dark')).toHaveTextContent('light');
    });

    const toggleButton = screen.getByTestId('toggle-theme');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId('is-dark')).toHaveTextContent('dark');
    });
  });

  it('should apply correct colors for light theme', async () => {
    mockGetColorScheme.mockReturnValue('light');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      const bgColor = screen.getByTestId('background-color');
      expect(bgColor).toHaveTextContent('#F9FAFB'); // Light theme background
    });
  });

  it('should apply correct colors for dark theme', async () => {
    mockGetColorScheme.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      const bgColor = screen.getByTestId('background-color');
      expect(bgColor).toHaveTextContent('#111827'); // Dark theme background
    });
  });

  it('should persist theme preference', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-dark')).toHaveTextContent('dark');
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });
  });

  it('should listen to system theme changes', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(mockAddChangeListener).toHaveBeenCalled();
    });
  });

  it('should update theme when system theme changes', async () => {
    mockGetColorScheme.mockReturnValue('light');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-dark')).toHaveTextContent('light');
    });

    // Simulate system theme change
    mockGetColorScheme.mockReturnValue('dark');
    const listener = mockAddChangeListener.mock.calls[0][0];
    listener({ colorScheme: 'dark' });

    await waitFor(() => {
      expect(screen.getByTestId('is-dark')).toHaveTextContent('dark');
    });
  });
});
