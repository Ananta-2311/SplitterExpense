import { PrismaClient } from '@prisma/client';
import { categorizeTransaction } from './categorization';

const prisma = new PrismaClient();

/**
 * Get or create a category for a user based on category name
 */
export async function getOrCreateCategory(
  userId: string,
  categoryName: string
): Promise<string> {
  // First, try to find existing category
  const existingCategory = await prisma.category.findFirst({
    where: {
      userId,
      name: {
        equals: categoryName,
        mode: 'insensitive',
      },
    },
  });

  if (existingCategory) {
    return existingCategory.id;
  }

  // Create new category if it doesn't exist
  const newCategory = await prisma.category.create({
    data: {
      userId,
      name: categoryName,
      description: `Auto-created category for ${categoryName}`,
    },
  });

  return newCategory.id;
}

/**
 * Categorize transaction and get/create category
 */
export async function categorizeAndGetCategoryId(
  userId: string,
  description: string,
  autoCategorize: boolean = true,
  openaiApiKey?: string
): Promise<string | null> {
  if (!autoCategorize) {
    return null;
  }

  try {
    const result = await categorizeTransaction(description, openaiApiKey);
    const categoryId = await getOrCreateCategory(userId, result.category);
    return categoryId;
  } catch (error) {
    console.error('Auto-categorization error:', error);
    // Return null on error, let user manually categorize
    return null;
  }
}

