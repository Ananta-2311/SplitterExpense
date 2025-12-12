import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { corsMiddleware, errorHandler, apiRateLimiter } from './middleware';
import { authRoutes } from './routes';
import transactionsRoutes from './routes/transactions';
import categorizeRoutes from './routes/categorize';
import analyticsRoutes from './routes/analytics';
import recurringRoutes from './routes/recurring';
import { startScheduler } from './services/scheduler';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(apiRateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/transactions/recurring', recurringRoutes);
app.use('/api', categorizeRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  
  // Start recurring expense detection scheduler
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

