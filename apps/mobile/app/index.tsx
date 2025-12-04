import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { User, Transaction, Category, Budget } from '@expensetracker/shared';

export default function Home() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Expense Tracker</Text>
      <View style={styles.card}>
        <Text style={styles.text}>
          Welcome to Expense Tracker! The shared package is working correctly.
        </Text>
        <Text style={styles.subtext}>
          ✅ Shared types imported: User, Transaction, Category, Budget
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
  },
  subtext: {
    fontSize: 14,
    color: '#6b7280',
  },
});

