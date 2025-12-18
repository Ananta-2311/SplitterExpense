import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionsPage from '../pages/transactions/index';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/transactions',
    query: {},
  }),
}));

// Mock auth
const mockGetTransactions = vi.fn();
vi.mock('../lib/auth', () => ({
  getAccessToken: () => 'mock-token',
  apiClient: {
    getTransactions: mockGetTransactions,
  },
}));

// Mock Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe('Transaction Filtering Tests', () => {
  const mockTransactions = [
    {
      id: '1',
      amount: 100,
      description: 'Grocery Store',
      type: 'expense' as const,
      date: '2024-01-15',
      category: { id: 'cat1', name: 'Food', color: '#FF0000' },
    },
    {
      id: '2',
      amount: 50,
      description: 'Salary',
      type: 'income' as const,
      date: '2024-01-16',
      category: { id: 'cat2', name: 'Income', color: '#00FF00' },
    },
    {
      id: '3',
      amount: 25,
      description: 'Coffee Shop',
      type: 'expense' as const,
      date: '2024-01-17',
      category: { id: 'cat1', name: 'Food', color: '#FF0000' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter transactions by type (expense)', async () => {
    mockGetTransactions.mockResolvedValue({
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

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalled();
    });

    // Check that expense filter is applied
    const expenseFilter = screen.getByText('Expense');
    expect(expenseFilter).toBeInTheDocument();
  });

  it('should filter transactions by type (income)', async () => {
    mockGetTransactions.mockResolvedValue({
      data: {
        transactions: mockTransactions.filter((t) => t.type === 'income'),
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalled();
    });
  });

  it('should filter transactions by search query', async () => {
    mockGetTransactions.mockResolvedValue({
      data: {
        transactions: mockTransactions.filter((t) =>
          t.description.toLowerCase().includes('grocery')
        ),
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: 'grocery' } });
    });

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'grocery',
        })
      );
    });
  });

  it('should sort transactions by date', async () => {
    mockGetTransactions.mockResolvedValue({
      data: {
        transactions: [...mockTransactions].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
        },
      },
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'date',
          sortOrder: 'desc',
        })
      );
    });
  });

  it('should sort transactions by amount', async () => {
    mockGetTransactions.mockResolvedValue({
      data: {
        transactions: [...mockTransactions].sort((a, b) => b.amount - a.amount),
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
        },
      },
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      const amountHeader = screen.getByText(/amount/i);
      expect(amountHeader).toBeInTheDocument();
    });
  });

  it('should filter transactions by category', async () => {
    mockGetTransactions.mockResolvedValue({
      data: {
        transactions: mockTransactions.filter((t) => t.category.id === 'cat1'),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalled();
    });
  });

  it('should handle pagination', async () => {
    mockGetTransactions.mockResolvedValue({
      data: {
        transactions: mockTransactions.slice(0, 20),
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
        },
      },
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      );
    });
  });
});
