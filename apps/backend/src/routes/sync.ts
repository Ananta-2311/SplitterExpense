import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

const router = Router();
const prisma = new PrismaClient();

// Sync pull endpoint - get transactions updated since lastSync
router.post('/pull', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { lastSync } = req.body;

    // If no lastSync provided, return all transactions
    const where: any = {
      userId,
    };

    if (lastSync) {
      const lastSyncDate = new Date(lastSync);
      where.updatedAt = {
        gt: lastSyncDate,
      };
    }

    // Get all transactions updated since lastSync
    const transactions = await prisma.transaction.findMany({
      where,
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
        updatedAt: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        transactions,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Sync pull error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to pull transactions',
      },
    });
  }
});

// Sync push endpoint - merge client transactions with server
router.post('/push', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { transactions: clientTransactions } = req.body;

    if (!Array.isArray(clientTransactions)) {
      return res.status(400).json({
        success: false,
        error: { message: 'transactions must be an array' },
      });
    }

    const results = {
      created: 0,
      updated: 0,
      conflicts: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    // Process each transaction
    for (const clientTx of clientTransactions) {
      try {
        const { id, amount, description, type, categoryId, date, updatedAt } = clientTx;

        // Validate required fields
        if (!id || !amount || !description || !type || !categoryId || !date) {
          results.errors.push({
            id: id || 'unknown',
            error: 'Missing required fields',
          });
          continue;
        }

        // Check if transaction exists
        const existingTx = await prisma.transaction.findUnique({
          where: { id },
        });

        if (existingTx) {
          // Transaction exists - resolve conflict using updatedAt
          const clientUpdatedAt = updatedAt ? new Date(updatedAt) : new Date(0);
          const serverUpdatedAt = existingTx.updatedAt;

          // Server decides: use the one with the latest updatedAt
          if (clientUpdatedAt > serverUpdatedAt) {
            // Client version is newer - update server
            await prisma.transaction.update({
              where: { id },
              data: {
                amount,
                description,
                type,
                categoryId,
                date: new Date(date),
                updatedAt: clientUpdatedAt,
              },
            });
            results.updated++;
          } else if (clientUpdatedAt < serverUpdatedAt) {
            // Server version is newer - keep server version
            results.conflicts++;
          } else {
            // Same timestamp - update anyway (shouldn't happen but handle it)
            await prisma.transaction.update({
              where: { id },
              data: {
                amount,
                description,
                type,
                categoryId,
                date: new Date(date),
              },
            });
            results.updated++;
          }
        } else {
          // Transaction doesn't exist - create it
          await prisma.transaction.create({
            data: {
              id,
              amount,
              description,
              type,
              categoryId,
              userId,
              date: new Date(date),
              updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
            },
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          id: clientTx.id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      data: {
        ...results,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Sync push error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to push transactions',
      },
    });
  }
});

export default router;
