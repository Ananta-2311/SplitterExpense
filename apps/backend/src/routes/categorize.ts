import { Router, Response } from 'express';
import { categorizeTransaction } from '../services/categorization';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

const router = Router();

// Categorize transaction endpoint
router.post(
  '/categorize',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { text, useAI } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          error: { message: 'Text is required and must be a string' },
        });
      }

      const openaiApiKey = useAI ? process.env.OPENAI_API_KEY : undefined;
      const result = await categorizeTransaction(text, openaiApiKey);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Categorization error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to categorize transaction',
        },
      });
    }
  }
);

export default router;

