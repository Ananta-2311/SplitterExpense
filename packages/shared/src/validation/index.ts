import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name is too long'),
  description: z.string().max(200, 'Description is too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().optional(),
});

export const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(200, 'Description is too long'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Type must be either income or expense' }),
  }),
  categoryId: z.string().min(1, 'Category ID is required'),
  date: z.coerce.date(),
});

export const budgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required').max(100, 'Budget name is too long'),
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid period' }),
  }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const recurringExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(200, 'Description is too long'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Type must be either income or expense' }),
  }),
  categoryId: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid frequency' }),
  }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  nextDueDate: z.coerce.date(),
});

