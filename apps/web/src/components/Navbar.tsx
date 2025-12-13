'use client';

import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSync } from '../lib/useSync';
import { getAccessToken, clearTokens } from '../lib/auth';

export default function Navbar() {
  const router = useRouter();
  const { isSyncing } = useSync();
  const isAuthenticated = typeof window !== 'undefined' && getAccessToken();

  const handleLogout = () => {
    clearTokens();
    router.push('/auth/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
              Expense Tracker
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/transactions"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Transactions
              </Link>
              <Link
                href="/recurring"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Recurring
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Sync indicator */}
            {isSyncing && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span>Syncing...</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
