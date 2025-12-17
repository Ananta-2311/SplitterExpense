import { Stack } from 'expo-router';
import { SyncProvider } from '../src/lib/useSync';
import { ThemeProvider } from '../src/lib/useTheme';
import { SyncHeader } from '../src/components/SyncHeader';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SyncProvider>
        <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Expense Tracker',
            headerRight: () => <SyncHeader />
          }} 
        />
        <Stack.Screen 
          name="home" 
          options={{ 
            title: 'Home',
            headerRight: () => <SyncHeader />
          }} 
        />
        <Stack.Screen 
          name="dashboard" 
          options={{ 
            title: 'Dashboard',
            headerRight: () => <SyncHeader />
          }} 
        />
        <Stack.Screen 
          name="transactions" 
          options={{ 
            title: 'Transactions',
            headerRight: () => <SyncHeader />
          }} 
        />
        <Stack.Screen 
          name="recurring" 
          options={{ 
            title: 'Recurring Expenses',
            headerRight: () => <SyncHeader />
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Settings',
            headerRight: () => <SyncHeader />
          }} 
        />
        <Stack.Screen 
          name="screens/LoginScreen" 
          options={{ title: 'Sign In', headerShown: false }} 
        />
        <Stack.Screen 
          name="screens/RegisterScreen" 
          options={{ title: 'Sign Up', headerShown: false }} 
        />
      </Stack>
      </SyncProvider>
    </ThemeProvider>
  );
}

