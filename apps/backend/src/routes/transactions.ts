import { Router, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import { transactionSchema } from '@expensetracker/shared';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { categorizeAndGetCategoryId } from '../services/categoryHelper';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// Create transaction endpoint with auto-categorization
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { amount, description, type, categoryId, date, autoCategorize = true } = req.body;

    // Validate input
    const validation = transactionSchema.safeParse({
      amount,
      description,
      type,
      categoryId: categoryId || 'temp', // Temporary for validation
      date: date ? new Date(date) : new Date(),
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.error.errors,
        },
      });
    }

    // Auto-categorize if enabled and no category provided
    let finalCategoryId = categoryId;
    if (!finalCategoryId && autoCategorize && description) {
      const autoCategoryId = await categorizeAndGetCategoryId(
        userId,
        description,
        true,
        process.env.OPENAI_API_KEY
      );
      if (autoCategoryId) {
        finalCategoryId = autoCategoryId;
      }
    }

    // If still no category, use default
    if (!finalCategoryId) {
      const defaultCategory = await prisma.category.findFirst({
        where: { userId, name: 'Uncategorized' },
      });

      if (defaultCategory) {
        finalCategoryId = defaultCategory.id;
      } else {
        const newCategory = await prisma.category.create({
          data: {
            userId,
            name: 'Uncategorized',
            description: 'Default category',
          },
        });
        finalCategoryId = newCategory.id;
      }
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        amount,
        description,
        type,
        categoryId: finalCategoryId,
        userId,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create transaction',
      },
    });
  }
});

interface ParsedRow {
  date?: string;
  amount?: string;
  description?: string;
  type?: string;
  [key: string]: string | undefined;
}

interface ColumnMapping {
  date: string;
  amount: string;
  description: string;
  type: string;
}

// Helper function to detect column indices
const detectColumns = (headers: string[]): ColumnMapping | null => {
  const mapping: Partial<ColumnMapping> = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  // Detect date column
  const dateIndices = lowerHeaders.findIndex((h) =>
    ['date', 'transaction date', 'transaction_date', 'time', 'timestamp'].includes(h)
  );
  if (dateIndices !== -1) {
    mapping.date = headers[dateIndices];
  }

  // Detect amount column
  const amountIndices = lowerHeaders.findIndex((h) =>
    ['amount', 'value', 'price', 'cost', 'total', 'sum'].includes(h)
  );
  if (amountIndices !== -1) {
    mapping.amount = headers[amountIndices];
  }

  // Detect description column
  const descIndices = lowerHeaders.findIndex((h) =>
    ['description', 'desc', 'note', 'memo', 'details', 'name', 'merchant', 'payee'].includes(h)
  );
  if (descIndices !== -1) {
    mapping.description = headers[descIndices];
  }

  // Detect type column
  const typeIndices = lowerHeaders.findIndex((h) =>
    ['type', 'category', 'transaction type', 'transaction_type', 'in/out'].includes(h)
  );
  if (typeIndices !== -1) {
    mapping.type = headers[typeIndices];
  }

  // Check if we have minimum required columns
  if (mapping.date && mapping.amount && mapping.description) {
    return mapping as ColumnMapping;
  }

  return null;
};

// Helper function to parse amount
const parseAmount = (value: string): number => {
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$€£¥,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to parse date
const parseDate = (value: string): Date => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
};

// Helper function to determine transaction type
const determineType = (value: string | undefined, amount: number): 'income' | 'expense' => {
  if (!value) {
    // Default to expense if amount is positive, income if negative
    return amount >= 0 ? 'expense' : 'income';
  }

  const lower = value.toLowerCase().trim();
  if (['income', 'in', 'credit', 'deposit', '+', 'positive'].includes(lower)) {
    return 'income';
  }
  if (['expense', 'out', 'debit', 'withdrawal', '-', 'negative'].includes(lower)) {
    return 'expense';
  }

  // If amount is negative, it's likely income (money coming in)
  return amount < 0 ? 'income' : 'expense';
};

// Import CSV endpoint
router.post(
  '/import-csv',
  requireAuth,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'No file uploaded' },
        });
      }

      const userId = req.userId!;
      const { categoryId, mapping } = req.body;

      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ParsedRow[];

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'CSV file is empty or invalid' },
        });
      }

      // Detect or use provided column mapping
      const headers = Object.keys(records[0]);
      let columnMapping: ColumnMapping;

      if (mapping) {
        // Use provided mapping
        columnMapping = JSON.parse(mapping);
      } else {
        // Auto-detect columns
        const detected = detectColumns(headers);
        if (!detected) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Could not detect required columns. Please provide column mapping.',
              detectedHeaders: headers,
            },
          });
        }
        columnMapping = detected;
      }

      // Auto-categorize transactions if enabled
      const autoCategorize = req.body.autoCategorize !== false; // Default to true
      
      // Get or create default category if categoryId not provided
      let defaultCategoryId = categoryId;
      if (!defaultCategoryId) {
        const defaultCategory = await prisma.category.findFirst({
          where: { userId, name: 'Uncategorized' },
        });

        if (defaultCategory) {
          defaultCategoryId = defaultCategory.id;
        } else {
          const newCategory = await prisma.category.create({
            data: {
              userId,
              name: 'Uncategorized',
              description: 'Default category for imported transactions',
            },
          });
          defaultCategoryId = newCategory.id;
        }
      }

      // Parse and validate transactions
      const transactions = [];
      const errors = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          const dateValue = row[columnMapping.date] || '';
          const amountValue = row[columnMapping.amount] || '0';
          const descriptionValue = row[columnMapping.description] || '';
          const typeValue = row[columnMapping.type];

          const amount = parseAmount(amountValue);
          const date = parseDate(dateValue);
          const description = descriptionValue.trim() || 'Imported transaction';
          const type = determineType(typeValue, amount);

          // Auto-categorize if enabled
          let transactionCategoryId = defaultCategoryId;
          if (autoCategorize && description) {
            const autoCategoryId = await categorizeAndGetCategoryId(
              userId,
              description,
              true,
              process.env.OPENAI_API_KEY
            );
            if (autoCategoryId) {
              transactionCategoryId = autoCategoryId;
            }
          }

          // Validate using shared schema
          const validation = transactionSchema.safeParse({
            amount: Math.abs(amount), // Use absolute value
            description,
            type,
            categoryId: transactionCategoryId,
            date,
          });

          if (!validation.success) {
            errors.push({
              row: i + 2, // +2 because of header and 0-index
              errors: validation.error.errors,
            });
            continue;
          }

          transactions.push({
            amount: Math.abs(amount),
            description,
            type,
            categoryId: transactionCategoryId,
            userId,
            date,
          });
        } catch (error) {
          errors.push({
            row: i + 2,
            errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
          });
        }
      }

      if (transactions.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No valid transactions found',
            errors,
          },
        });
      }

      // Save transactions to database
      const created = await prisma.transaction.createMany({
        data: transactions,
      });

      res.json({
        success: true,
        data: {
          imported: created.count,
          total: records.length,
          errors: errors.length > 0 ? errors : undefined,
          columnMapping,
        },
      });
    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to import CSV',
        },
      });
    }
  }
);

// Preview CSV endpoint (returns parsed data without saving)
router.post(
  '/preview-csv',
  requireAuth,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'No file uploaded' },
        });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ParsedRow[];

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'CSV file is empty or invalid' },
        });
      }

      const headers = Object.keys(records[0]);
      const columnMapping = detectColumns(headers);

      // Return first 10 rows for preview
      const preview = records.slice(0, 10).map((row, index) => ({
        row: index + 2,
        data: row,
      }));

      res.json({
        success: true,
        data: {
          headers,
          columnMapping,
          preview,
          totalRows: records.length,
        },
      });
    } catch (error) {
      console.error('CSV preview error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to parse CSV',
        },
      });
    }
  }
);

export default router;

