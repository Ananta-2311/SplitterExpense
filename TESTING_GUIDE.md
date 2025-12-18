# Testing Guide

This guide explains how to run tests for all parts of the Expense Tracker application.

## Overview

- **Backend**: Jest for unit and integration tests
- **Web**: Vitest for component and integration tests
- **Mobile**: Jest + React Native Testing Library for component tests

## Running Tests

### Backend Tests

```bash
cd apps/backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Files:**
- `src/__tests__/auth.test.ts` - Authentication tests (register, login, logout, refresh)
- `src/__tests__/csv.test.ts` - CSV parsing and column detection tests
- `src/__tests__/categorization.test.ts` - Categorization engine tests (rule-based and AI)

### Web Tests

```bash
cd apps/web

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

**Test Files:**
- `src/__tests__/transactionFiltering.test.tsx` - Transaction filtering, sorting, and pagination
- `src/__tests__/chartRendering.test.tsx` - Chart rendering and data display
- `src/__tests__/authFlow.test.tsx` - Authentication flow tests

### Mobile Tests

```bash
cd apps/mobile

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Files:**
- `src/__tests__/LoginForm.test.tsx` - Login form validation and submission
- `src/__tests__/TransactionsList.test.tsx` - Transactions list rendering and filtering
- `src/__tests__/ThemeSwitching.test.tsx` - Theme switching and color application

## Test Coverage

### Backend Coverage

Tests cover:
- ✅ User registration with validation
- ✅ User login with password verification
- ✅ Logout functionality
- ✅ Token refresh
- ✅ CSV column detection
- ✅ CSV amount parsing
- ✅ CSV date parsing
- ✅ Transaction type determination
- ✅ Rule-based categorization
- ✅ AI categorization (mocked)
- ✅ Categorization fallback logic

### Web Coverage

Tests cover:
- ✅ Transaction filtering by type (income/expense)
- ✅ Transaction search by description
- ✅ Transaction sorting (date, amount)
- ✅ Category filtering
- ✅ Pagination
- ✅ Chart rendering (Line, Bar, Pie)
- ✅ Summary cards display
- ✅ Empty state handling
- ✅ Login form rendering
- ✅ Successful login flow
- ✅ Login error handling
- ✅ Loading states

### Mobile Coverage

Tests cover:
- ✅ Login form rendering
- ✅ Form validation
- ✅ Successful login
- ✅ Login error handling
- ✅ Loading states
- ✅ Transactions list rendering
- ✅ Transaction filtering
- ✅ Search functionality
- ✅ Pull to refresh
- ✅ Theme initialization
- ✅ Theme switching
- ✅ Color application
- ✅ System theme detection
- ✅ Theme persistence

## Writing New Tests

### Backend Test Example

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Feature Name', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Web Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Component Name', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Mobile Test Example

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';

describe('Component Name', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});
```

## Test Configuration

### Backend (Jest)
- Config: `apps/backend/jest.config.js`
- Setup: `apps/backend/src/__tests__/setup.ts`
- Environment: Node.js

### Web (Vitest)
- Config: `apps/web/vitest.config.ts`
- Setup: `apps/web/src/__tests__/setup.ts`
- Environment: jsdom

### Mobile (Jest + Expo)
- Config: `apps/mobile/jest.config.js`
- Setup: `apps/mobile/src/__tests__/setup.ts`
- Environment: jest-expo

## Continuous Integration

To run all tests in CI:

```bash
# From root directory
cd apps/backend && npm test
cd ../web && npm test
cd ../mobile && npm test
```

Or use TurboRepo to run all tests in parallel:

```bash
# Add to root package.json
npm run test
```

## Troubleshooting

### Backend Tests
- Ensure Prisma Client is generated: `npm run prisma:generate`
- Check that test database is set up (if using integration tests)

### Web Tests
- Ensure all dependencies are installed
- Check that Next.js router is properly mocked

### Mobile Tests
- Use `--legacy-peer-deps` if encountering dependency conflicts
- Ensure jest-expo is properly configured
- Check that Expo modules are mocked correctly

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies (APIs, databases, etc.)
3. **Coverage**: Aim for >80% code coverage
4. **Naming**: Use descriptive test names
5. **Organization**: Group related tests in describe blocks
6. **Cleanup**: Clean up after each test
