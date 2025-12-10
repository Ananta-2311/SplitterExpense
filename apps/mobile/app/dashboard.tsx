import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  VictoryLine,
  VictoryChart,
  VictoryBar,
  VictoryPie,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
  VictoryLegend,
  VictoryContainer,
} from 'victory-native';
import { isAuthenticated, getAccessToken, apiClient } from '../src/lib/auth';
import { formatCurrency } from '@expensetracker/shared';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface CategoryData {
  categoryId: string;
  name: string;
  amount: number;
  color?: string;
  count: number;
  percentage: number;
}

interface IncomeExpenseData {
  totalIncome: number;
  totalExpense: number;
  net: number;
  monthlyBreakdown: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
}

const COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
];

export default function DashboardScreen() {
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        router.replace('/screens/LoginScreen');
        return;
      }
      await fetchAnalytics();
    };
    checkAuth();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/screens/LoginScreen');
        return;
      }
      apiClient.setAccessToken(token);

      const [monthly, categories, incomeExpense] = await Promise.all([
        apiClient.getMonthlyAnalytics(6),
        apiClient.getCategoryAnalytics(3),
        apiClient.getIncomeExpenseAnalytics(6),
      ]);

      setMonthlyData(monthly.data);
      setCategoryData(categories.data);
      setIncomeExpenseData(incomeExpense.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short' });
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

  // Prepare data for Victory charts
  const lineChartData = monthlyData.map((item, index) => ({
    x: index,
    y: item.net,
    month: formatMonth(item.month),
  }));

  const pieChartData = categoryData.map((item, index) => ({
    x: item.name,
    y: item.amount,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const barChartData = incomeExpenseData?.monthlyBreakdown.map((item, index) => ({
    x: index,
    income: item.income,
    expense: item.expense,
    month: formatMonth(item.month),
  })) || [];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
        </View>

        {/* Summary Cards */}
        {incomeExpenseData && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Income</Text>
              <Text style={[styles.summaryValue, styles.incomeValue]}>
                {formatCurrency(incomeExpenseData.totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Expense</Text>
              <Text style={[styles.summaryValue, styles.expenseValue]}>
                {formatCurrency(incomeExpenseData.totalExpense)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text
                style={[
                  styles.summaryValue,
                  incomeExpenseData.net >= 0 ? styles.incomeValue : styles.expenseValue,
                ]}
              >
                {formatCurrency(incomeExpenseData.net)}
              </Text>
            </View>
          </View>
        )}

        {/* Monthly Line Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Overview</Text>
          {lineChartData.length > 0 ? (
            <VictoryChart
              width={CHART_WIDTH}
              height={250}
              theme={VictoryTheme.material}
              padding={{ left: 50, right: 20, top: 20, bottom: 50 }}
            >
              <VictoryAxis
                tickFormat={(t) => {
                  const item = monthlyData[t];
                  return item ? formatMonth(item.month) : '';
                }}
                style={{
                  tickLabels: { fontSize: 10, angle: -45 },
                }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t) => `$${t}`}
                style={{
                  tickLabels: { fontSize: 10 },
                }}
              />
              <VictoryLine
                data={lineChartData}
                style={{
                  data: { stroke: '#4F46E5', strokeWidth: 2 },
                }}
                labels={({ datum }) => formatCurrency(datum.y)}
                labelComponent={<VictoryTooltip />}
              />
            </VictoryChart>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          )}
        </View>

        {/* Category Pie Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Expenses by Category</Text>
          {pieChartData.length > 0 ? (
            <View style={styles.pieContainer}>
              <VictoryPie
                data={pieChartData}
                width={CHART_WIDTH}
                height={250}
                colorScale={pieChartData.map((d) => d.color)}
                labels={({ datum }) => `${datum.x}: ${formatCurrency(datum.y)}`}
                labelRadius={({ innerRadius }) => (innerRadius || 0) + 40}
                style={{
                  labels: { fontSize: 10, fill: '#374151' },
                }}
              />
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No category data available</Text>
            </View>
          )}
        </View>

        {/* Income vs Expense Bar Chart */}
        {barChartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Income vs Expense</Text>
            <VictoryChart
              width={CHART_WIDTH}
              height={300}
              theme={VictoryTheme.material}
              padding={{ left: 50, right: 20, top: 20, bottom: 60 }}
            >
              <VictoryAxis
                tickFormat={(t) => {
                  const item = incomeExpenseData?.monthlyBreakdown[t];
                  return item ? formatMonth(item.month) : '';
                }}
                style={{
                  tickLabels: { fontSize: 10, angle: -45 },
                }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t) => `$${t}`}
                style={{
                  tickLabels: { fontSize: 10 },
                }}
              />
              <VictoryLegend
                x={CHART_WIDTH / 2 - 60}
                y={10}
                orientation="horizontal"
                gutter={20}
                data={[
                  { name: 'Income', symbol: { fill: '#10B981' } },
                  { name: 'Expense', symbol: { fill: '#EF4444' } },
                ]}
              />
              <VictoryBar
                data={barChartData}
                x="x"
                y="income"
                style={{
                  data: { fill: '#10B981' },
                }}
                barWidth={15}
              />
              <VictoryBar
                data={barChartData}
                x="x"
                y="expense"
                style={{
                  data: { fill: '#EF4444' },
                }}
                barWidth={15}
              />
            </VictoryChart>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  incomeValue: {
    color: '#10B981',
  },
  expenseValue: {
    color: '#EF4444',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  pieContainer: {
    alignItems: 'center',
  },
  emptyChart: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});


