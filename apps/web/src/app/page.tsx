'use client';

import { User, Transaction, Category, Budget } from '@expensetracker/shared';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Expense Tracker
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            Welcome to Expense Tracker! The shared package is working correctly.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p>✅ Shared types imported: User, Transaction, Category, Budget</p>
          </div>
        </div>
      </div>
    </main>
  );
}

