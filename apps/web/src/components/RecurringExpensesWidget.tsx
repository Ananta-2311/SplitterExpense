import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../lib/auth';
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

export default function RecurringExpensesWidget() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecurringExpenses();
  }, []);

  const fetchRecurringExpenses = async () => {
    try {
      const response = await apiClient.getRecurringExpenses();
      setExpenses(response.data.slice(0, 5)); // Show top 5
    } catch (error) {
      console.error('Failed to fetch recurring expenses:', error);
    } finally {
      setLoading(false);
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recurring Expenses</h2>
          <Link
            href="/recurring"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View All
          </Link>
        </div>
        <p className="text-gray-500 text-sm">No recurring expenses detected yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Recurring Expenses</h2>
        <Link
          href="/recurring"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View All
        </Link>
      </div>
      <div className="space-y-4">
        {expenses.map((expense) => {
          const daysUntil = getDaysUntilDue(expense.nextDueDate);
          const isOverdue = daysUntil < 0;
          const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

          return (
            <div key={expense.id} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{expense.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {expense.category && (
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-full"
                        style={{
                          backgroundColor: expense.category.color || '#E5E7EB',
                          color: expense.category.color ? '#FFFFFF' : '#374151',
                        }}
                      >
                        {expense.category.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 capitalize">{expense.frequency}</span>
                  </div>
                </div>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Next due: {formatDate(expense.nextDueDate)}
                </p>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

