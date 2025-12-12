import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getAccessToken, apiClient } from '../lib/auth';
import { formatCurrency } from '@expensetracker/shared';
import RecurringExpensesWidget from '../components/RecurringExpensesWidget';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface CategoryData {
  categoryId: string;
  name: string;
  amount: number;
  color?: string;
  count: number;
  percentage: number;
}

interface IncomeExpenseData {
  totalIncome: number;
  totalExpense: number;
  net: number;
  monthlyBreakdown: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
}

const COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
];

export default function Dashboard() {
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchAnalytics();
  }, [router]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [monthly, categories, incomeExpense] = await Promise.all([
        apiClient.getMonthlyAnalytics(6),
        apiClient.getCategoryAnalytics(3),
        apiClient.getIncomeExpenseAnalytics(6),
      ]);

      setMonthlyData(monthly.data);
      setCategoryData(categories.data);
      setIncomeExpenseData(incomeExpense.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Summary Cards */}
        {incomeExpenseData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Total Income</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(incomeExpenseData.totalIncome)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Total Expense</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(incomeExpenseData.totalExpense)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Net</p>
              <p
                className={`text-3xl font-bold ${
                  incomeExpenseData.net >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(incomeExpenseData.net)}
              </p>
            </div>
          </div>
        )}

        {/* Recurring Expenses Widget */}
        <div className="mb-6">
          <RecurringExpensesWidget />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Line Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  style={{ fontSize: '12px' }}
                />
                <YAxis tickFormatter={(value) => `$${value}`} style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => formatMonth(label)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Expense"
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  name="Net"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Expenses by Category</h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Income vs Expense Bar Chart */}
        {incomeExpenseData && incomeExpenseData.monthlyBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Income vs Expense by Month
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={incomeExpenseData.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  style={{ fontSize: '12px' }}
                />
                <YAxis tickFormatter={(value) => `$${value}`} style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => formatMonth(label)}
                />
                <Legend />
                <Bar dataKey="income" fill="#10B981" name="Income" />
                <Bar dataKey="expense" fill="#EF4444" name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
