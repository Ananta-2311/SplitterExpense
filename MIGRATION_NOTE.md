# Database Migration Required

A new `UserPreferences` model has been added to the Prisma schema. You need to create and run a migration.

## Steps to Apply Migration

1. Navigate to the backend directory:
```bash
cd apps/backend
```

2. Create the migration:
```bash
npm run prisma:migrate
```

When prompted, name it something like: `add_user_preferences`

3. The migration will:
   - Create the `user_preferences` table
   - Add a foreign key relationship to the `users` table

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

## What the Migration Adds

- `UserPreferences` model with:
  - `aiCategorization` (boolean, default: true)
  - `emailNotifications` (boolean, default: true)
  - `pushNotifications` (boolean, default: true)
  - One-to-one relationship with User

## After Migration

The backend will automatically create default preferences for existing users when they first access the settings endpoint.
