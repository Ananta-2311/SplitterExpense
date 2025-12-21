import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
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
import { chartsToImage } from '../lib/chartToImage';
import { ChartSkeleton, SummaryCardSkeleton } from '../components/SkeletonLoader';

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
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
      // Use batched endpoint for better performance
      const batched = await apiClient.getBatchedAnalytics(6, 3);

      setMonthlyData(batched.data.monthly);
      setCategoryData(batched.data.categories);
      setIncomeExpenseData(batched.data.incomeExpense);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Fallback to individual endpoints if batched fails
      try {
        const [monthly, categories, incomeExpense] = await Promise.all([
          apiClient.getMonthlyAnalytics(6),
          apiClient.getCategoryAnalytics(3),
          apiClient.getIncomeExpenseAnalytics(6),
        ]);

        setMonthlyData(monthly.data);
        setCategoryData(categories.data);
        setIncomeExpenseData(incomeExpense.data);
      } catch (fallbackError) {
        console.error('Fallback analytics fetch failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      // Convert charts to images (only if they exist)
      const chartIds: Array<{ id: string; type: string }> = [
        { id: 'monthly-chart', type: 'monthly' },
        { id: 'category-chart', type: 'category' },
      ];

      // Only add income-expense chart if data exists
      if (incomeExpenseData && incomeExpenseData.monthlyBreakdown.length > 0) {
        chartIds.push({ id: 'income-expense-chart', type: 'incomeExpense' });
      }

      const chartImages = await chartsToImage(chartIds);

      // Get PDF blob (backend will calculate summaries for the selected month)
      const blob = await apiClient.exportPdf({
        month: String(selectedMonth),
        year: String(selectedYear),
        chartImages,
      });

      // Download PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-report-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Memoize chart components to prevent re-renders
  const MonthlyChart = useMemo(() => {
    if (loading || monthlyData.length === 0) return null;
    return (
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
    );
  }, [monthlyData, loading]);

  const CategoryChart = useMemo(() => {
    if (loading || categoryData.length === 0) return null;
    return (
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
    );
  }, [categoryData, loading]);

  const IncomeExpenseChart = useMemo(() => {
    if (loading || !incomeExpenseData || incomeExpenseData.monthlyBreakdown.length === 0) return null;
    return (
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
    );
  }, [incomeExpenseData, loading]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="month-select" className="text-sm font-medium text-gray-700">
                Month:
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-1 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
                Year:
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-1 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  )
                )}
              </select>
            </div>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </div>
        ) : incomeExpenseData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 min-h-[120px]">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Income</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(incomeExpenseData.totalIncome)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 min-h-[120px]">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Expense</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(incomeExpenseData.totalExpense)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 min-h-[120px]">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Net</p>
              <p
                className={`text-3xl font-bold ${
                  incomeExpenseData.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatCurrency(incomeExpenseData.net)}
              </p>
            </div>
          </div>
        ) : null}

        {/* Recurring Expenses Widget */}
        <div className="mb-6">
          <RecurringExpensesWidget />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 min-h-[380px]" id="monthly-chart">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Monthly Overview</h2>
            {loading ? (
              <ChartSkeleton />
            ) : MonthlyChart ? (
              MonthlyChart
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No monthly data available
              </div>
            )}
          </div>

          {/* Category Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 min-h-[380px]" id="category-chart">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Expenses by Category</h2>
            {loading ? (
              <ChartSkeleton />
            ) : CategoryChart ? (
              CategoryChart
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Income vs Expense Bar Chart */}
        {loading ? (
          <ChartSkeleton />
        ) : incomeExpenseData && incomeExpenseData.monthlyBreakdown.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 min-h-[500px]" id="income-expense-chart">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Income vs Expense by Month
            </h2>
            {IncomeExpenseChart}
          </div>
        ) : null}
      </div>
    </div>
  );
}
