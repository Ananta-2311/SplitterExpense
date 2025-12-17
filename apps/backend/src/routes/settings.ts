import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { userSchema } from '@expensetracker/shared';

const router = Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get profile',
      },
    });
  }
});

// Update profile
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, email } = req.body;

    // Validate input
    const validation = userSchema.safeParse({ email, name });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.error.errors,
        },
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email already in use' },
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update profile',
      },
    });
  }
});

// Change password
router.post('/password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current password and new password are required' },
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: { message: 'New password must be at least 8 characters long' },
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Current password is incorrect' },
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to change password',
      },
    });
  }
});

// Get all categories
router.get('/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get categories',
      },
    });
  }
});

// Create category
router.post('/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, description, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Category name is required' },
      });
    }

    // Check if category with same name already exists
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Category with this name already exists' },
      });
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name,
        description,
        color,
        icon,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create category',
      },
    });
  }
});

// Update category
router.put('/categories/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, description, color, icon } = req.body;

    // Check if category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found' },
      });
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existing = await prisma.category.findFirst({
        where: {
          userId,
          name: {
            equals: name,
            mode: 'insensitive',
          },
          NOT: { id },
        },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: { message: 'Category with this name already exists' },
        });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update category',
      },
    });
  }
});

// Delete category
router.delete('/categories/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Check if category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: { id, userId },
      include: {
        transactions: {
          take: 1,
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found' },
      });
    }

    // Check if category is used in transactions
    if (category.transactions.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete category that is used in transactions',
        },
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to delete category',
      },
    });
  }
});

// Get user preferences
router.get('/preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          aiCategorization: true,
          emailNotifications: true,
          pushNotifications: true,
        },
      });
    }

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get preferences',
      },
    });
  }
});

// Update user preferences
router.put('/preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { aiCategorization, emailNotifications, pushNotifications } = req.body;

    // Get or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          aiCategorization: aiCategorization !== undefined ? aiCategorization : true,
          emailNotifications:
            emailNotifications !== undefined ? emailNotifications : true,
          pushNotifications: pushNotifications !== undefined ? pushNotifications : true,
        },
      });
    } else {
      preferences = await prisma.userPreferences.update({
        where: { userId },
        data: {
          ...(aiCategorization !== undefined && { aiCategorization }),
          ...(emailNotifications !== undefined && { emailNotifications }),
          ...(pushNotifications !== undefined && { pushNotifications }),
        },
      });
    }

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update preferences',
      },
    });
  }
});

export default router;
