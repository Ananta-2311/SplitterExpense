# Expense Tracker Monorepo

A monorepo for an expense tracking application built with TurboRepo, featuring web, mobile, and backend applications.

## Structure

```
expensetracker/
├── apps/
│   ├── web/          # React + TypeScript + Tailwind (Next.js)
│   ├── mobile/       # React Native + Expo + TypeScript
│   └── backend/      # Node Express + TypeScript + Prisma
├── packages/
│   └── shared/       # Shared types, utils, validation, API wrapper
└── package.json      # Root workspace configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (for backend)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables for the backend:
```bash
cd apps/backend
cp .env.example .env
# Edit .env with your PostgreSQL connection string
```

3. Set up the database:
```bash
cd apps/backend
npm run prisma:generate
npm run prisma:migrate
```

## Development

### Run all apps in development mode:
```bash
npm run dev
```

### Run individual apps:

**Web:**
```bash
cd apps/web
npm run dev
```

**Mobile:**
```bash
cd apps/mobile
npm run dev
```

**Backend:**
```bash
cd apps/backend
npm run dev
```

## Packages

### `@expensetracker/shared`

Shared package containing:
- **Types**: `User`, `Transaction`, `Category`, `Budget`
- **Validation**: Zod schemas for all entities
- **Utils**: Currency formatting, date formatting, calculations
- **API**: API client wrapper for HTTP requests

Usage in apps:
```typescript
import { User, Transaction, formatCurrency } from '@expensetracker/shared';
```

## Database

The backend uses Prisma with PostgreSQL. The schema includes:
- Users
- Categories
- Transactions
- Budgets

### Prisma Commands

```bash
cd apps/backend
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio
```

## Build

Build all packages:
```bash
npm run build
```

## Scripts

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run clean` - Clean all build artifacts

## Workspace Configuration

The monorepo uses npm workspaces and TurboRepo for:
- Fast builds with caching
- Parallel task execution
- Dependency management across packages

## Apps

### Web (`apps/web`)
- Next.js 14 with App Router
- React 18
- TypeScript
- Tailwind CSS

### Mobile (`apps/mobile`)
- Expo SDK 50
- React Native 0.73
- TypeScript
- Expo Router

### Backend (`apps/backend`)
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL

## Workspace Dependencies

Both `web` and `mobile` apps import the `shared` package via workspace:
```json
{
  "dependencies": {
    "@expensetracker/shared": "*"
  }
}
```

This allows for type-safe sharing of code across all applications.
