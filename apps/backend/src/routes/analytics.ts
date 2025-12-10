import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

const router = Router();
const prisma = new PrismaClient();

// Monthly analytics endpoint
router.get('/monthly', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { months = '6' } = req.query;
    const monthsCount = parseInt(months as string, 10);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);

    // Get transactions grouped by month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        type: true,
        date: true,
      },
    });

    // Group by month
    const monthlyData: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((transaction) => {
      const monthKey = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }

      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount;
      } else {
        monthlyData[monthKey].expense += transaction.amount;
      }
    });

    // Convert to array and sort by month
    const result = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Monthly analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch monthly analytics',
      },
    });
  }
});

// Category analytics endpoint
router.get('/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { months = '3' } = req.query;
    const monthsCount = parseInt(months as string, 10);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);

    // Get transactions with categories
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: 'expense', // Only expenses for category breakdown
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
    });

    // Group by category
    const categoryData: Record<
      string,
      { name: string; amount: number; color?: string; count: number }
    > = {};

    transactions.forEach((transaction) => {
      const categoryId = transaction.categoryId;
      const category = transaction.category;

      if (!categoryData[categoryId]) {
        categoryData[categoryId] = {
          name: category.name,
          amount: 0,
          color: category.color || undefined,
          count: 0,
        };
      }

      categoryData[categoryId].amount += transaction.amount;
      categoryData[categoryId].count += 1;
    });

    // Convert to array and sort by amount
    const result = Object.entries(categoryData)
      .map(([categoryId, data]) => ({
        categoryId,
        name: data.name,
        amount: data.amount,
        color: data.color,
        count: data.count,
        percentage: 0, // Will be calculated on frontend
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate percentages
    const total = result.reduce((sum, item) => sum + item.amount, 0);
    result.forEach((item) => {
      item.percentage = total > 0 ? (item.amount / total) * 100 : 0;
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Category analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch category analytics',
      },
    });
  }
});

// Income vs Expense analytics endpoint
router.get('/income-expense', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { months = '6' } = req.query;
    const monthsCount = parseInt(months as string, 10);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        type: true,
        date: true,
      },
    });

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpense += transaction.amount;
      }
    });

    // Group by month for bar chart
    const monthlyData: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((transaction) => {
      const monthKey = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }

      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount;
      } else {
        monthlyData[monthKey].expense += transaction.amount;
      }
    });

    // Convert to array and sort by month
    const monthlyBreakdown = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        monthlyBreakdown,
      },
    });
  } catch (error) {
    console.error('Income-expense analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch income-expense analytics',
      },
    });
  }
});

export default router;


