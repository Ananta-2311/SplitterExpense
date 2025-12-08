/**
 * Standard transaction categories
 */
export enum TransactionCategory {
  Food = 'Food',
  Transport = 'Transport',
  Bills = 'Bills',
  Shopping = 'Shopping',
  Entertainment = 'Entertainment',
  Health = 'Health',
  Education = 'Education',
  Income = 'Income',
  Other = 'Other',
}

/**
 * Categorization confidence levels
 */
export enum CategorizationConfidence {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

/**
 * Categorization method
 */
export enum CategorizationMethod {
  RuleBased = 'rule-based',
  AI = 'ai',
}

/**
 * Categorization result
 */
export interface CategorizationResult {
  category: TransactionCategory | string;
  confidence: CategorizationConfidence | 'high' | 'medium' | 'low';
  method: CategorizationMethod | 'rule-based' | 'ai';
}

/**
 * Categorization request
 */
export interface CategorizationRequest {
  text: string;
  useAI?: boolean;
}

/**
 * Categorization response
 */
export interface CategorizationResponse {
  success: boolean;
  data: CategorizationResult;
  error?: {
    message: string;
  };
}

