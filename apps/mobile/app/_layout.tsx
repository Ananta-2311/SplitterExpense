import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Expense Tracker' }} />
      <Stack.Screen name="home" options={{ title: 'Home' }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Stack.Screen 
        name="screens/LoginScreen" 
        options={{ title: 'Sign In', headerShown: false }} 
      />
      <Stack.Screen 
        name="screens/RegisterScreen" 
        options={{ title: 'Sign Up', headerShown: false }} 
      />
    </Stack>
  );
}

