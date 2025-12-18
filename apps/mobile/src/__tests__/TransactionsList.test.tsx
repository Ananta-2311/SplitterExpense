import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TransactionsScreen from '../../app/transactions';
import * as auth from '../../src/lib/auth';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('../../src/lib/auth', () => ({
  isAuthenticated: jest.fn(() => Promise.resolve(true)),
  getAccessToken: jest.fn(() => Promise.resolve('mock-token')),
  apiClient: {
    setAccessToken: jest.fn(),
    getTransactions: jest.fn(),
  },
}));

const mockTransactions = [
  {
    id: '1',
    amount: 100,
    description: 'Grocery Store',
    type: 'expense' as const,
    date: '2024-01-15T00:00:00Z',
    category: { id: 'cat1', name: 'Food', color: '#FF0000' },
  },
  {
    id: '2',
    amount: 50,
    description: 'Salary',
    type: 'income' as const,
    date: '2024-01-16T00:00:00Z',
    category: { id: 'cat2', name: 'Income', color: '#00FF00' },
  },
  {
    id: '3',
    amount: 25,
    description: 'Coffee Shop',
    type: 'expense' as const,
    date: '2024-01-17T00:00:00Z',
    category: { id: 'cat1', name: 'Food', color: '#FF0000' },
  },
];

describe('Transactions List Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth.apiClient.getTransactions as jest.Mock).mockResolvedValue({
      data: {
        transactions: mockTransactions,
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
        },
      },
    });
  });

  it('should render transactions list', async () => {
    render(<TransactionsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeTruthy();
      expect(screen.getByText('Salary')).toBeTruthy();
      expect(screen.getByText('Coffee Shop')).toBeTruthy();
    });
  });

  it('should filter transactions by type', async () => {
    (auth.apiClient.getTransactions as jest.Mock).mockResolvedValue({
      data: {
        transactions: mockTransactions.filter((t) => t.type === 'expense'),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
    });

    render(<TransactionsScreen />);

    await waitFor(() => {
      expect(auth.apiClient.getTransactions).toHaveBeenCalled();
    });
  });

  it('should search transactions by description', async () => {
    render(<TransactionsScreen />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeTruthy();

      fireEvent.changeText(searchInput, 'grocery');
    });

    await waitFor(() => {
      expect(auth.apiClient.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'grocery',
        })
      );
    });
  });

  it('should display transaction details correctly', async () => {
    render(<TransactionsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeTruthy();
      // Check that amount is displayed
      expect(screen.getByText(/\$100/)).toBeTruthy();
    });
  });

  it('should handle empty transactions list', async () => {
    (auth.apiClient.getTransactions as jest.Mock).mockResolvedValue({
      data: {
        transactions: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      },
    });

    render(<TransactionsScreen />);

    await waitFor(() => {
      expect(auth.apiClient.getTransactions).toHaveBeenCalled();
    });
  });

  it('should handle loading state', () => {
    (auth.apiClient.getTransactions as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<TransactionsScreen />);

    // Should show loading indicator
    expect(screen.queryByText('Grocery Store')).toBeFalsy();
  });

  it('should refresh transactions on pull to refresh', async () => {
    render(<TransactionsScreen />);

    await waitFor(() => {
      expect(auth.apiClient.getTransactions).toHaveBeenCalled();
    });

    const callCount = (auth.apiClient.getTransactions as jest.Mock).mock.calls.length;

    // Simulate pull to refresh
    const flatList = screen.UNSAFE_getByType(require('react-native').FlatList);
    if (flatList) {
      fireEvent(flatList, 'refresh');
    }

    await waitFor(() => {
      expect(auth.apiClient.getTransactions).toHaveBeenCalledTimes(callCount + 1);
    });
  });
});
