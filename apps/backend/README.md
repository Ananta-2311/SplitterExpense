# Backend API

Express.js backend with TypeScript, Prisma, and PostgreSQL.

## Environment Variables

Create a `.env` file in the `apps/backend` directory with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/expensetracker?schema=public"
PORT=3001
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"
ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:19006"
NODE_ENV="development"
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

3. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (requires auth)
- `POST /api/auth/refresh` - Refresh access token

### Health Check

- `GET /health` - Server health check

## Middleware

- `requireAuth` - Protects routes that require authentication
- `authRateLimiter` - Rate limiting for auth endpoints (5 requests per 15 minutes)
- `apiRateLimiter` - Rate limiting for API endpoints (100 requests per 15 minutes)
- `errorHandler` - Global error handler
- `corsMiddleware` - CORS configuration

## Database Models

- User
- Session
- Transaction
- Category
- Budget
- RecurringExpense

