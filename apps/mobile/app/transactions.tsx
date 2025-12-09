import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isAuthenticated, getAccessToken, apiClient } from '../src/lib/auth';
import { formatCurrency, formatDate } from '@expensetracker/shared';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  date: string;
  category: {
    id: string;
    name: string;
    color?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        router.replace('/screens/LoginScreen');
        return;
      }
      await fetchTransactions();
    };
    checkAuth();
  }, [pagination.page, typeFilter, searchQuery, categoryFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/screens/LoginScreen');
        return;
      }
      apiClient.setAccessToken(token);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'date',
        sortOrder: 'desc',
      };

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (categoryFilter !== 'all') {
        params.categoryId = categoryFilter;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await apiClient.getTransactions(params);
      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchTransactions();
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages && !loading) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const uniqueCategories = Array.from(
    new Map(transactions.map((t) => [t.category.id, t.category])).values()
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            item.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
          ]}
        >
          {item.type === 'income' ? '+' : '-'}
          {formatCurrency(item.amount)}
        </Text>
      </View>
      <View style={styles.transactionFooter}>
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
        <View
          style={[
            styles.typeBadge,
            item.type === 'income' ? styles.incomeBadge : styles.expenseBadge,
          ]}
        >
          <Text
            style={[
              styles.typeText,
              item.type === 'income' ? styles.incomeText : styles.expenseText,
            ]}
          >
            {item.type}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          placeholderTextColor="#9CA3AF"
        />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowTypeFilter(true)}
          >
            <Text style={styles.filterButtonText}>
              Type: {typeFilter === 'all' ? 'All' : typeFilter}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowCategoryFilter(true)}
          >
            <Text style={styles.filterButtonText}>
              Category: {categoryFilter === 'all' ? 'All' : 'Category'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions List */}
      {loading && pagination.page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && pagination.page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Type Filter Modal */}
      <Modal
        visible={showTypeFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypeFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Type</Text>
            <ScrollView>
              {(['all', 'income', 'expense'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.modalOption}
                  onPress={() => {
                    setTypeFilter(type);
                    setShowTypeFilter(false);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                  {typeFilter === type && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTypeFilter(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Category</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setCategoryFilter('all');
                  setShowCategoryFilter(false);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <Text style={styles.modalOptionText}>All Categories</Text>
                {categoryFilter === 'all' && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              {uniqueCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setCategoryFilter(category.id);
                    setShowCategoryFilter(false);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  <Text style={styles.modalOptionText}>{category.name}</Text>
                  {categoryFilter === category.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryFilter(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#10B981',
  },
  expenseAmount: {
    color: '#EF4444',
  },
  transactionFooter: {
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
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incomeBadge: {
    backgroundColor: '#D1FAE5',
  },
  expenseBadge: {
    backgroundColor: '#FEE2E2',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  incomeText: {
    color: '#065F46',
  },
  expenseText: {
    color: '#991B1B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  checkmark: {
    fontSize: 18,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

