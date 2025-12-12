import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { getRecurringExpenses, detectRecurringExpenses } from '../services/recurringDetection';

const router = Router();

// Get recurring expenses
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const recurringExpenses = await getRecurringExpenses(userId);

    res.json({
      success: true,
      data: recurringExpenses,
    });
  } catch (error) {
    console.error('Get recurring expenses error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch recurring expenses',
      },
    });
  }
});

// Trigger detection manually
router.post('/detect', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await detectRecurringExpenses(userId);
    
    const recurringExpenses = await getRecurringExpenses(userId);

    res.json({
      success: true,
      message: 'Recurring expenses detection completed',
      data: recurringExpenses,
    });
  } catch (error) {
    console.error('Detect recurring expenses error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to detect recurring expenses',
      },
    });
  }
});

export default router;

