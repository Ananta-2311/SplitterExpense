import { apiClient } from './auth';

const LAST_SYNC_KEY = 'last_sync_timestamp';
const LOCAL_TRANSACTIONS_KEY = 'local_transactions';

export interface LocalTransaction {
  id: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  categoryId: string;
  date: string;
  updatedAt: string;
}

// Get last sync timestamp from localStorage
export const getLastSync = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_SYNC_KEY);
};

// Set last sync timestamp
export const setLastSync = (timestamp: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SYNC_KEY, timestamp);
};

// Get local transactions from localStorage
export const getLocalTransactions = (): LocalTransaction[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Set local transactions to localStorage
export const setLocalTransactions = (transactions: LocalTransaction[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
};

// Add or update a local transaction
export const upsertLocalTransaction = (transaction: LocalTransaction) => {
  const local = getLocalTransactions();
  const index = local.findIndex((t) => t.id === transaction.id);
  if (index >= 0) {
    local[index] = transaction;
  } else {
    local.push(transaction);
  }
  setLocalTransactions(local);
};

// Perform sync: pull from server and push local changes
export const performSync = async (): Promise<{
  success: boolean;
  pulled: number;
  pushed: { created: number; updated: number; conflicts: number };
}> => {
  try {
    const lastSync = getLastSync();
    const localTransactions = getLocalTransactions();

    // First, push local transactions to server
    let pushResult = { created: 0, updated: 0, conflicts: 0 };
    if (localTransactions.length > 0) {
      try {
        const pushResponse = await apiClient.syncPush(localTransactions);
        if (pushResponse.success) {
          pushResult = pushResponse.data;
          // Clear local transactions after successful push
          setLocalTransactions([]);
          // Update last sync to server time
          setLastSync(pushResponse.data.serverTime);
        }
      } catch (error) {
        console.error('Sync push error:', error);
        // Continue with pull even if push fails
      }
    }

    // Then, pull updates from server
    let pulled = 0;
    try {
      const pullResponse = await apiClient.syncPull(lastSync || undefined);
      if (pullResponse.success) {
        pulled = pullResponse.data.transactions.length;
        // Update last sync to server time
        setLastSync(pullResponse.data.serverTime);
        
        // Store pulled transactions in localStorage for the app to use
        // The app should merge these with its current state
        if (pulled > 0) {
          const pulledTransactions = pullResponse.data.transactions.map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            description: tx.description,
            type: tx.type,
            categoryId: tx.categoryId,
            date: tx.date,
            updatedAt: tx.updatedAt,
          }));
          
          // Merge with existing local transactions (avoid duplicates)
          const existing = getLocalTransactions();
          const existingIds = new Set(existing.map((t) => t.id));
          const newTransactions = pulledTransactions.filter((t) => !existingIds.has(t.id));
          setLocalTransactions([...existing, ...newTransactions]);
        }
      }
    } catch (error) {
      console.error('Sync pull error:', error);
    }

    return {
      success: true,
      pulled,
      pushed: pushResult,
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      pulled: 0,
      pushed: { created: 0, updated: 0, conflicts: 0 },
    };
  }
};
