import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isAuthenticated, getAccessToken, apiClient } from '../src/lib/auth';
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

export default function RecurringExpensesScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        router.replace('/screens/LoginScreen');
        return;
      }
      await fetchRecurringExpenses();
    };
    checkAuth();
  }, []);

  const fetchRecurringExpenses = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/screens/LoginScreen');
        return;
      }
      apiClient.setAccessToken(token);

      const response = await apiClient.getRecurringExpenses();
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to fetch recurring expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecurringExpenses();
  };

  const getDaysUntilDue = (nextDueDate: string): number => {
    const due = new Date(nextDueDate);
    const today = new Date();
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const renderExpense = ({ item }: { item: RecurringExpense }) => {
    const daysUntil = getDaysUntilDue(item.nextDueDate);
    const isOverdue = daysUntil < 0;
    const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseHeader}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseDescription}>{item.description}</Text>
            <View style={styles.expenseMeta}>
              {item.category && (
                <View
                  style={[
                    styles.categoryBadge,
                    item.category.color && { backgroundColor: item.category.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      item.category.color && { color: '#FFFFFF' },
                    ]}
                  >
                    {item.category.name}
                  </Text>
                </View>
              )}
              <Text style={styles.frequencyText}>{item.frequency}</Text>
            </View>
          </View>
          <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
        </View>
        <View style={styles.expenseFooter}>
          <Text style={styles.dueDateText}>Next due: {formatDate(item.nextDueDate)}</Text>
          <View
            style={[
              styles.statusBadge,
              isOverdue
                ? styles.overdueBadge
                : isDueSoon
                ? styles.dueSoonBadge
                : styles.onTimeBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isOverdue
                  ? styles.overdueText
                  : isDueSoon
                  ? styles.dueSoonText
                  : styles.onTimeText,
              ]}
            >
              {isOverdue
                ? `${Math.abs(daysUntil)} days overdue`
                : isDueSoon
                ? `Due in ${daysUntil} days`
                : `${daysUntil} days remaining`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>Recurring Expenses</Text>
        <TouchableOpacity
          style={[styles.detectButton, detecting && styles.detectButtonDisabled]}
          onPress={handleDetect}
          disabled={detecting}
        >
          {detecting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.detectButtonText}>Detect</Text>
          )}
        </TouchableOpacity>
      </View>

      {expenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recurring expenses detected yet.</Text>
          <Text style={styles.emptySubtext}>
            Recurring expenses are automatically detected when you import transactions.
          </Text>
          <TouchableOpacity
            style={styles.detectButton}
            onPress={handleDetect}
            disabled={detecting}
          >
            {detecting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.detectButtonText}>Run Detection Now</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpense}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  detectButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detectButtonDisabled: {
    opacity: 0.6,
  },
  detectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  expenseMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  frequencyText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
  },
  dueSoonBadge: {
    backgroundColor: '#FEF3C7',
  },
  onTimeBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overdueText: {
    color: '#991B1B',
  },
  dueSoonText: {
    color: '#92400E',
  },
  onTimeText: {
    color: '#065F46',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
});

