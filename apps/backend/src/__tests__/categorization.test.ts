import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  categorizeByRules,
  categorizeByAI,
  categorizeTransaction,
  CategorizationResult,
} from '../services/categorization';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('Categorization Engine Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('categorizeByRules', () => {
    it('should categorize food transactions correctly', () => {
      const result = categorizeByRules('Starbucks coffee purchase');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Food');
      expect(result?.method).toBe('rule-based');
    });

    it('should categorize transport transactions correctly', () => {
      const result = categorizeByRules('Uber ride to airport');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Transport');
      expect(result?.method).toBe('rule-based');
    });

    it('should categorize bills transactions correctly', () => {
      const result = categorizeByRules('Electricity bill payment');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Bills');
      expect(result?.method).toBe('rule-based');
    });

    it('should categorize shopping transactions correctly', () => {
      const result = categorizeByRules('Amazon purchase');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Shopping');
      expect(result?.method).toBe('rule-based');
    });

    it('should categorize entertainment transactions correctly', () => {
      const result = categorizeByRules('Movie theater tickets');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Entertainment');
      expect(result?.method).toBe('rule-based');
    });

    it('should categorize health transactions correctly', () => {
      const result = categorizeByRules('CVS pharmacy purchase');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Health');
      expect(result?.method).toBe('rule-based');
    });

    it('should categorize education transactions correctly', () => {
      const result = categorizeByRules('University tuition payment');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Education');
      expect(result?.method).toBe('rule-based');
    });

    it('should categorize income transactions correctly', () => {
      const result = categorizeByRules('Salary deposit');
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Income');
      expect(result?.method).toBe('rule-based');
    });

    it('should return null for unrecognized transactions', () => {
      const result = categorizeByRules('Random transaction xyz123');
      expect(result).toBeNull();
    });

    it('should have high confidence for multiple keyword matches', () => {
      const result = categorizeByRules('Starbucks coffee and food delivery');
      expect(result).not.toBeNull();
      expect(result?.confidence).toBe('high');
    });

    it('should have medium confidence for single keyword match', () => {
      const result = categorizeByRules('Restaurant');
      expect(result).not.toBeNull();
      expect(result?.confidence).toBe('medium');
    });

    it('should be case-insensitive', () => {
      const result1 = categorizeByRules('STARBUCKS COFFEE');
      const result2 = categorizeByRules('starbucks coffee');
      const result3 = categorizeByRules('Starbucks Coffee');

      expect(result1?.category).toBe('Food');
      expect(result2?.category).toBe('Food');
      expect(result3?.category).toBe('Food');
    });
  });

  describe('categorizeByAI', () => {
    it('should categorize using AI when API key is provided', async () => {
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Food',
            },
          },
        ],
      });

      const result = await categorizeByAI('Lunch at a restaurant', 'test-api-key');
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('ai');
      expect(result?.category).toBe('Food');
    });

    it('should throw error when API key is missing', async () => {
      await expect(categorizeByAI('Transaction', undefined)).rejects.toThrow(
        'OpenAI API key is required'
      );
    });

    it('should fallback to Other category on AI error', async () => {
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await categorizeByAI('Transaction', 'test-api-key');
      
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Other');
      expect(result?.confidence).toBe('low');
    });

    it('should validate AI response category', async () => {
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'InvalidCategory',
            },
          },
        ],
      });

      const result = await categorizeByAI('Transaction', 'test-api-key');
      
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Other'); // Should default to Other for invalid category
    });
  });

  describe('categorizeTransaction', () => {
    it('should use rule-based categorization when confidence is high', async () => {
      const result = await categorizeTransaction('Starbucks coffee purchase');
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('rule-based');
      expect(result?.category).toBe('Food');
      expect(result?.confidence).toBe('high');
    });

    it('should fallback to AI when rule-based has low confidence', async () => {
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Shopping',
            },
          },
        ],
      });

      const result = await categorizeTransaction('Unclear transaction description', 'test-api-key');
      
      expect(result).not.toBeNull();
      // Should try AI if rule-based has low confidence
      expect(result?.method).toBe('ai');
    });

    it('should return rule-based result when no API key provided', async () => {
      const result = await categorizeTransaction('Restaurant meal');
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('rule-based');
    });

    it('should return Other category when no match found and no API key', async () => {
      const result = await categorizeTransaction('Random transaction xyz');
      
      expect(result).not.toBeNull();
      expect(result?.category).toBe('Other');
      expect(result?.confidence).toBe('low');
    });
  });
});
