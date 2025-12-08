import OpenAI from 'openai';

// Category keyword mappings for rule-based engine
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    'restaurant', 'cafe', 'coffee', 'food', 'grocery', 'supermarket', 'walmart', 'target',
    'kroger', 'safeway', 'whole foods', 'trader joe', 'pizza', 'burger', 'mcdonald',
    'starbucks', 'subway', 'kfc', 'taco bell', 'dining', 'lunch', 'dinner', 'breakfast',
    'bakery', 'delivery', 'ubereats', 'doordash', 'grubhub', 'meal', 'snack', 'takeout'
  ],
  Transport: [
    'uber', 'lyft', 'taxi', 'cab', 'gas', 'fuel', 'petrol', 'diesel', 'shell', 'bp',
    'chevron', 'exxon', 'parking', 'toll', 'metro', 'subway', 'bus', 'train', 'airport',
    'flight', 'airline', 'car rental', 'hertz', 'avis', 'budget', 'car', 'vehicle',
    'maintenance', 'repair', 'auto', 'mechanic', 'insurance', 'registration', 'dmv'
  ],
  Bills: [
    'electric', 'electricity', 'power', 'utility', 'water', 'gas bill', 'internet',
    'wifi', 'cable', 'tv', 'phone', 'mobile', 'cell', 'rent', 'mortgage', 'housing',
    'insurance', 'health insurance', 'car insurance', 'home insurance', 'subscription',
    'netflix', 'spotify', 'amazon prime', 'disney', 'hulu', 'youtube premium'
  ],
  Shopping: [
    'amazon', 'ebay', 'walmart', 'target', 'costco', 'best buy', 'apple store',
    'nike', 'adidas', 'clothing', 'shoes', 'electronics', 'furniture', 'home depot',
    'lowes', 'ikea', 'mall', 'retail', 'store', 'purchase', 'buy', 'shop'
  ],
  Entertainment: [
    'movie', 'cinema', 'theater', 'concert', 'show', 'ticket', 'event', 'festival',
    'game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'app store',
    'music', 'concert', 'sports', 'stadium', 'venue', 'bar', 'club', 'nightlife'
  ],
  Health: [
    'hospital', 'doctor', 'pharmacy', 'cvs', 'walgreens', 'medical', 'health',
    'dentist', 'dental', 'optometrist', 'glasses', 'prescription', 'medicine',
    'gym', 'fitness', 'yoga', 'pilates', 'personal trainer', 'vitamin', 'supplement'
  ],
  Education: [
    'school', 'university', 'college', 'tuition', 'textbook', 'course', 'class',
    'education', 'learning', 'training', 'certification', 'exam', 'test', 'library'
  ],
  Income: [
    'salary', 'paycheck', 'wage', 'income', 'payment', 'deposit', 'refund',
    'bonus', 'commission', 'freelance', 'gig', 'transfer', 'credit'
  ],
  Other: [
    'transfer', 'fee', 'charge', 'service', 'misc', 'other', 'unknown'
  ]
};

export interface CategorizationResult {
  category: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'rule-based' | 'ai';
}

/**
 * Rule-based categorization using keyword matching
 */
export function categorizeByRules(text: string): CategorizationResult | null {
  const lowerText = text.toLowerCase();
  
  // Count matches for each category
  const categoryScores: Record<string, number> = {};
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      categoryScores[category] = score;
    }
  }
  
  if (Object.keys(categoryScores).length === 0) {
    return null;
  }
  
  // Find category with highest score
  const bestCategory = Object.entries(categoryScores).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];
  
  const maxScore = categoryScores[bestCategory];
  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
  
  // Calculate confidence based on score dominance
  let confidence: 'high' | 'medium' | 'low';
  if (maxScore >= 3 || maxScore / totalScore > 0.7) {
    confidence = 'high';
  } else if (maxScore >= 2 || maxScore / totalScore > 0.5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return {
    category: bestCategory,
    confidence,
    method: 'rule-based',
  };
}

/**
 * AI-based categorization using OpenAI
 */
export async function categorizeByAI(
  text: string,
  openaiApiKey?: string
): Promise<CategorizationResult> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key is required for AI categorization');
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  });

  const categories = Object.keys(CATEGORY_KEYWORDS).join(', ');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a transaction categorization assistant. Categorize the given transaction description into one of these categories: ${categories}. 
          
Return only the category name, nothing else. If the transaction is clearly income-related, use "Income". Otherwise, choose the most appropriate category from: Food, Transport, Bills, Shopping, Entertainment, Health, Education, Other.`,
        },
        {
          role: 'user',
          content: `Categorize this transaction: "${text}"`,
        },
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    const category = completion.choices[0]?.message?.content?.trim() || 'Other';
    
    // Validate the category
    const validCategory = Object.keys(CATEGORY_KEYWORDS).includes(category)
      ? category
      : 'Other';

    return {
      category: validCategory,
      confidence: 'medium',
      method: 'ai',
    };
  } catch (error) {
    console.error('OpenAI categorization error:', error);
    // Fallback to Other category
    return {
      category: 'Other',
      confidence: 'low',
      method: 'ai',
    };
  }
}

/**
 * Main categorization function with rule-based first, AI fallback
 */
export async function categorizeTransaction(
  text: string,
  openaiApiKey?: string
): Promise<CategorizationResult> {
  // Try rule-based first
  const ruleResult = categorizeByRules(text);
  
  if (ruleResult && ruleResult.confidence === 'high') {
    return ruleResult;
  }
  
  // If rule-based has medium/low confidence or no match, try AI
  if (openaiApiKey) {
    try {
      const aiResult = await categorizeByAI(text, openaiApiKey);
      
      // Prefer AI if rule-based had low confidence or no match
      if (!ruleResult || ruleResult.confidence === 'low') {
        return aiResult;
      }
      
      // If both exist, prefer rule-based with medium confidence over AI
      return ruleResult;
    } catch (error) {
      console.error('AI categorization failed, using rule-based result:', error);
      // Fallback to rule-based if AI fails
      return ruleResult || {
        category: 'Other',
        confidence: 'low',
        method: 'rule-based',
      };
    }
  }
  
  // No AI key, return rule-based result or default
  return ruleResult || {
    category: 'Other',
    confidence: 'low',
    method: 'rule-based',
  };
}

