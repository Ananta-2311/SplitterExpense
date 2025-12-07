import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getAccessToken } from '../../lib/auth';

export default function TransactionsPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <Link
            href="/transactions/import"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Import CSV
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Your transactions will appear here.</p>
        </div>
      </div>
    </div>
  );
}

