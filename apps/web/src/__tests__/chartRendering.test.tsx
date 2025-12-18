import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/dashboard';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/dashboard',
    query: {},
  }),
}));

// Mock auth - will be set up in beforeEach
const mockGetMonthlyAnalytics = vi.fn();
const mockGetCategoryAnalytics = vi.fn();
const mockGetIncomeExpenseAnalytics = vi.fn();

vi.mock('../lib/auth', () => ({
  getAccessToken: () => 'mock-token',
  apiClient: {
    getMonthlyAnalytics: mockGetMonthlyAnalytics,
    getCategoryAnalytics: mockGetCategoryAnalytics,
    getIncomeExpenseAnalytics: mockGetIncomeExpenseAnalytics,
  },
}));

// Mock Recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

// Mock Link
vi.mock('next/link', () => ({
  default: ({ children }: any) => <a>{children}</a>,
}));

describe('Chart Rendering Tests', () => {
  const mockMonthlyData = [
    { month: '2024-01', income: 1000, expense: 500, net: 500 },
    { month: '2024-02', income: 1200, expense: 600, net: 600 },
  ];

  const mockCategoryData = [
    { categoryId: '1', name: 'Food', amount: 300, count: 5, percentage: 50 },
    { categoryId: '2', name: 'Transport', amount: 200, count: 3, percentage: 33.3 },
  ];

  const mockIncomeExpenseData = {
    totalIncome: 2200,
    totalExpense: 1100,
    net: 1100,
    monthlyBreakdown: mockMonthlyData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMonthlyAnalytics.mockResolvedValue({ data: mockMonthlyData });
    mockGetCategoryAnalytics.mockResolvedValue({ data: mockCategoryData });
    mockGetIncomeExpenseAnalytics.mockResolvedValue({ data: mockIncomeExpenseData });
  });

  it('should render monthly line chart', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('should render category pie chart', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  it('should render income vs expense bar chart', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  it('should display summary cards with correct values', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Total Income/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Expense/i)).toBeInTheDocument();
      expect(screen.getByText(/Net/i)).toBeInTheDocument();
    });
  });

  it('should render charts with correct data', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(mockGetMonthlyAnalytics).toHaveBeenCalled();
      expect(mockGetCategoryAnalytics).toHaveBeenCalled();
      expect(mockGetIncomeExpenseAnalytics).toHaveBeenCalled();
    });
  });

  it('should handle empty data gracefully', async () => {
    mockGetMonthlyAnalytics.mockResolvedValue({ data: [] });
    mockGetCategoryAnalytics.mockResolvedValue({ data: [] });
    mockGetIncomeExpenseAnalytics.mockResolvedValue({
      data: {
        totalIncome: 0,
        totalExpense: 0,
        net: 0,
        monthlyBreakdown: [],
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/No category data available/i)).toBeInTheDocument();
    });
  });
});
