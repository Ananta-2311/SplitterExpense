import { describe, it, expect, beforeEach } from '@jest/globals';
import { parse } from 'csv-parse/sync';

// CSV parsing helper functions from transactions route
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

const detectColumns = (headers: string[]): ColumnMapping | null => {
  const mapping: Partial<ColumnMapping> = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  const dateIndices = lowerHeaders.findIndex((h) =>
    ['date', 'transaction date', 'transaction_date', 'time', 'timestamp'].includes(h)
  );
  if (dateIndices !== -1) {
    mapping.date = headers[dateIndices];
  }

  const amountIndices = lowerHeaders.findIndex((h) =>
    ['amount', 'value', 'price', 'cost', 'total', 'sum'].includes(h)
  );
  if (amountIndices !== -1) {
    mapping.amount = headers[amountIndices];
  }

  const descIndices = lowerHeaders.findIndex((h) =>
    ['description', 'desc', 'note', 'memo', 'details', 'name', 'merchant', 'payee'].includes(h)
  );
  if (descIndices !== -1) {
    mapping.description = headers[descIndices];
  }

  const typeIndices = lowerHeaders.findIndex((h) =>
    ['type', 'category', 'transaction type', 'transaction_type', 'in/out'].includes(h)
  );
  if (typeIndices !== -1) {
    mapping.type = headers[typeIndices];
  }

  if (mapping.date && mapping.amount && mapping.description) {
    return mapping as ColumnMapping;
  }

  return null;
};

const parseAmount = (value: string): number => {
  const cleaned = value.replace(/[$€£¥,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const parseDate = (value: string): Date => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
};

const determineType = (value: string | undefined, amount: number): 'income' | 'expense' => {
  if (!value) {
    return amount >= 0 ? 'expense' : 'income';
  }

  const lower = value.toLowerCase().trim();
  if (['income', 'in', 'credit', 'deposit', '+', 'positive'].includes(lower)) {
    return 'income';
  }
  if (['expense', 'out', 'debit', 'withdrawal', '-', 'negative'].includes(lower)) {
    return 'expense';
  }

  return amount < 0 ? 'income' : 'expense';
};

describe('CSV Parsing Tests', () => {
  describe('detectColumns', () => {
    it('should detect standard column names', () => {
      const headers = ['Date', 'Amount', 'Description', 'Type'];
      const mapping = detectColumns(headers);

      expect(mapping).not.toBeNull();
      expect(mapping?.date).toBe('Date');
      expect(mapping?.amount).toBe('Amount');
      expect(mapping?.description).toBe('Description');
      expect(mapping?.type).toBe('Type');
    });

    it('should detect alternative column names', () => {
      const headers = ['Transaction Date', 'Value', 'Merchant', 'Category'];
      const mapping = detectColumns(headers);

      expect(mapping).not.toBeNull();
      expect(mapping?.date).toBe('Transaction Date');
      expect(mapping?.amount).toBe('Value');
      expect(mapping?.description).toBe('Merchant');
    });

    it('should return null if required columns are missing', () => {
      const headers = ['Date', 'Amount']; // Missing description
      const mapping = detectColumns(headers);

      expect(mapping).toBeNull();
    });

    it('should handle case-insensitive column names', () => {
      const headers = ['DATE', 'amount', 'DESCRIPTION'];
      const mapping = detectColumns(headers);

      expect(mapping).not.toBeNull();
      expect(mapping?.date).toBe('DATE');
      expect(mapping?.amount).toBe('amount');
      expect(mapping?.description).toBe('DESCRIPTION');
    });
  });

  describe('parseAmount', () => {
    it('should parse simple numeric amounts', () => {
      expect(parseAmount('100')).toBe(100);
      expect(parseAmount('50.50')).toBe(50.5);
    });

    it('should remove currency symbols', () => {
      expect(parseAmount('$100')).toBe(100);
      expect(parseAmount('€50')).toBe(50);
      expect(parseAmount('£75')).toBe(75);
    });

    it('should remove commas and whitespace', () => {
      expect(parseAmount('1,000')).toBe(1000);
      expect(parseAmount('$ 1,234.56')).toBe(1234.56);
    });

    it('should return 0 for invalid input', () => {
      expect(parseAmount('invalid')).toBe(0);
      expect(parseAmount('')).toBe(0);
    });
  });

  describe('parseDate', () => {
    it('should parse valid date strings', () => {
      const date = parseDate('2024-01-15');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
    });

    it('should return current date for invalid input', () => {
      const before = new Date();
      const date = parseDate('invalid-date');
      const after = new Date();

      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('determineType', () => {
    it('should determine type from value', () => {
      expect(determineType('income', 100)).toBe('income');
      expect(determineType('expense', 100)).toBe('expense');
      expect(determineType('credit', 100)).toBe('income');
      expect(determineType('debit', 100)).toBe('expense');
    });

    it('should default to expense for positive amounts', () => {
      expect(determineType(undefined, 100)).toBe('expense');
    });

    it('should default to income for negative amounts', () => {
      expect(determineType(undefined, -100)).toBe('income');
    });
  });

  describe('CSV parsing integration', () => {
    it('should parse a complete CSV file', () => {
      const csvContent = `Date,Amount,Description,Type
2024-01-15,100.50,Grocery Store,expense
2024-01-16,50.00,Salary,income`;

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ParsedRow[];

      expect(records).toHaveLength(2);
      expect(records[0].Date).toBe('2024-01-15');
      expect(records[0].Amount).toBe('100.50');
      expect(records[0].Description).toBe('Grocery Store');
    });

    it('should handle CSV with missing optional columns', () => {
      const csvContent = `Date,Amount,Description
2024-01-15,100.50,Grocery Store`;

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ParsedRow[];

      expect(records).toHaveLength(1);
      expect(records[0].Date).toBe('2024-01-15');
    });

    it('should handle empty CSV files', () => {
      const csvContent = `Date,Amount,Description
`;

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ParsedRow[];

      expect(records).toHaveLength(0);
    });
  });
});
