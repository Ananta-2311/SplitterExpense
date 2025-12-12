import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TransactionGroup {
  description: string;
  amount: number;
  transactions: Array<{
    id: string;
    date: Date;
    amount: number;
    description: string;
    categoryId: string;
    type: string;
  }>;
}

/**
 * Normalize merchant/description name for comparison
 */
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 50); // Limit length
}

/**
 * Check if two amounts are similar (within 10% variance)
 */
function isSimilarAmount(amount1: number, amount2: number, threshold: number = 0.1): boolean {
  const diff = Math.abs(amount1 - amount2);
  const avg = (amount1 + amount2) / 2;
  return avg > 0 && diff / avg <= threshold;
}

/**
 * Calculate average days between transactions
 */
function calculateAverageInterval(dates: Date[]): number {
  if (dates.length < 2) return 0;

  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const intervals: number[] = [];

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    intervals.push(days);
  }

  return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
}

/**
 * Check if interval is roughly monthly (20-40 days)
 */
function isMonthlyInterval(interval: number): boolean {
  return interval >= 20 && interval <= 40;
}

/**
 * Detect recurring expenses from transactions
 */
export async function detectRecurringExpenses(userId: string): Promise<void> {
  try {
    // Get all expense transactions from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: sixMonthsAgo,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (transactions.length < 2) {
      return; // Need at least 2 transactions to detect patterns
    }

    // Group transactions by normalized description
    const groups: Map<string, TransactionGroup> = new Map();

    transactions.forEach((transaction) => {
      const normalized = normalizeDescription(transaction.description);
      
      if (!groups.has(normalized)) {
        groups.set(normalized, {
          description: transaction.description, // Use original for display
          amount: transaction.amount,
          transactions: [],
        });
      }

      const group = groups.get(normalized)!;
      
      // Only add if amount is similar (within 10%)
      if (isSimilarAmount(group.amount, transaction.amount)) {
        group.transactions.push({
          id: transaction.id,
          date: transaction.date,
          amount: transaction.amount,
          description: transaction.description,
          categoryId: transaction.categoryId,
          type: transaction.type,
        });
      }
    });

    // Filter groups that have at least 3 occurrences
    const recurringGroups = Array.from(groups.values()).filter(
      (group) => group.transactions.length >= 3
    );

    // Analyze each group for monthly patterns
    for (const group of recurringGroups) {
      const dates = group.transactions.map((t) => t.date);
      const avgInterval = calculateAverageInterval(dates);

      // Check if it's roughly monthly
      if (isMonthlyInterval(avgInterval)) {
        // Check if we already have this recurring expense
        const normalized = normalizeDescription(group.description);
        const existing = await prisma.recurringExpense.findFirst({
          where: {
            userId,
            description: {
              contains: normalized,
              mode: 'insensitive',
            },
          },
        });

        if (existing) {
          // Update existing recurring expense
          const lastTransaction = group.transactions[group.transactions.length - 1];
          const nextDueDate = new Date(lastTransaction.date);
          nextDueDate.setDate(nextDueDate.getDate() + Math.round(avgInterval));

          await prisma.recurringExpense.update({
            where: { id: existing.id },
            data: {
              amount: group.amount,
              nextDueDate,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new recurring expense
          const firstTransaction = group.transactions[0];
          const lastTransaction = group.transactions[group.transactions.length - 1];
          const nextDueDate = new Date(lastTransaction.date);
          nextDueDate.setDate(nextDueDate.getDate() + Math.round(avgInterval));

          await prisma.recurringExpense.create({
            data: {
              userId,
              amount: group.amount,
              description: group.description,
              type: 'expense',
              categoryId: firstTransaction.categoryId,
              frequency: 'monthly',
              startDate: firstTransaction.date,
              nextDueDate,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Recurring expense detection error:', error);
    throw error;
  }
}

/**
 * Get all recurring expenses for a user
 */
export async function getRecurringExpenses(userId: string) {
  return prisma.recurringExpense.findMany({
    where: {
      userId,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: {
      nextDueDate: 'asc',
    },
  });
}

