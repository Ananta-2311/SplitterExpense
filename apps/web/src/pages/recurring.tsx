import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAccessToken, apiClient } from '../lib/auth';
import { formatCurrency, formatDate } from '@expensetracker/shared';

interface RecurringExpense {
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
}

export default function RecurringExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchRecurringExpenses();
  }, [router]);

  const fetchRecurringExpenses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getRecurringExpenses();
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to fetch recurring expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const response = await apiClient.detectRecurringExpenses();
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to detect recurring expenses:', error);
    } finally {
      setDetecting(false);
    }
  };

  const getDaysUntilDue = (nextDueDate: string): number => {
    const due = new Date(nextDueDate);
    const today = new Date();
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Recurring Expenses</h1>
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {detecting ? 'Detecting...' : 'Detect Recurring Expenses'}
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No recurring expenses detected yet.</p>
            <p className="text-sm text-gray-400 mb-6">
              Recurring expenses are automatically detected when you import transactions or can be
              detected manually.
            </p>
            <button
              onClick={handleDetect}
              disabled={detecting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              {detecting ? 'Detecting...' : 'Run Detection Now'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => {
                  const daysUntil = getDaysUntilDue(expense.nextDueDate);
                  const isOverdue = daysUntil < 0;
                  const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {expense.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {expense.category ? (
                          <span
                            className="px-2 py-1 text-xs font-semibold rounded-full"
                            style={{
                              backgroundColor: expense.category.color || '#E5E7EB',
                              color: expense.category.color ? '#FFFFFF' : '#374151',
                            }}
                          >
                            {expense.category.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {expense.frequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(expense.nextDueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isOverdue
                              ? 'bg-red-100 text-red-800'
                              : isDueSoon
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isOverdue
                            ? `${Math.abs(daysUntil)} days overdue`
                            : isDueSoon
                            ? `Due in ${daysUntil} days`
                            : `${daysUntil} days remaining`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

