import { PrismaClient } from '@prisma/client';
import { detectRecurringExpenses } from './recurringDetection';

const prisma = new PrismaClient();

/**
 * Run recurring expense detection for all users
 * This should be called every 24 hours
 */
export async function runRecurringExpenseDetection(): Promise<void> {
  try {
    console.log('Starting scheduled recurring expense detection...');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
      },
    });

    // Run detection for each user
    for (const user of users) {
      try {
        await detectRecurringExpenses(user.id);
        console.log(`Recurring expense detection completed for user ${user.id}`);
      } catch (error) {
        console.error(`Failed to detect recurring expenses for user ${user.id}:`, error);
      }
    }

    console.log('Scheduled recurring expense detection completed');
  } catch (error) {
    console.error('Scheduled recurring expense detection error:', error);
  }
}

/**
 * Start the scheduler (runs every 24 hours)
 */
export function startScheduler(): void {
  // Run immediately on startup
  runRecurringExpenseDetection();

  // Then run every 24 hours
  const interval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  setInterval(() => {
    runRecurringExpenseDetection();
  }, interval);

  console.log('Recurring expense detection scheduler started (runs every 24 hours)');
}

