import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAccessToken } from './auth';
import { performSync } from './sync';

interface SyncContextType {
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  lastSyncTime: null,
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const sync = async () => {
    const token = await getAccessToken();
    if (!token) return;

    setIsSyncing(true);
    try {
      await performSync();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Background sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout | null = null;

    const initSync = async () => {
      const token = await getAccessToken();
      if (!token || !mounted) return;

      // Initial sync
      await sync();

      // Set up background sync every 30 seconds
      interval = setInterval(async () => {
        if (!mounted) {
          if (interval) clearInterval(interval);
          return;
        }
        await sync();
      }, 30000); // 30 seconds
    };

    initSync();

    return () => {
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncTime }}>
      {children}
    </SyncContext.Provider>
  );
}
