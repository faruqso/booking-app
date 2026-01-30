# Preventing Database Schema Errors

## What went wrong

Login failed with "Database connection error" when the real issue was: **the Prisma schema had columns (e.g. `Business.dateFormat`) that did not exist in the database.** Prisma error code `P2022` means "column does not exist."

## How to prevent it next time

### 1. After changing `prisma/schema.prisma`

Always sync the database before relying on new or changed columns:

```bash
# Sync schema to the database (adds missing columns/tables, does not drop data)
npm run db:push
```

Or, if you use migrations:

```bash
npm run db:migrate
```

### 2. Before deploying

- Run `npm run db:push` (or apply migrations) against your **production** database so the schema is up to date before or right after deploy.
- The project’s **Vercel build** runs `prisma db push` as part of `vercel-build`, so each deploy syncs the schema. Ensure `DATABASE_URL` in Vercel points to the correct DB.

### 3. When adding or renaming columns

1. Edit `prisma/schema.prisma`.
2. Run `npx prisma generate` (or `npm run db:generate`).
3. Run `npx prisma db push` (or `npm run db:push`) so the database has the new columns.
4. Restart the dev server if it’s running.

### 4. Quick check

To confirm the DB matches the schema:

```bash
npx prisma db push
```

If you see "Your database is now in sync with your Prisma schema", you’re good. If you see a list of changes, those have been applied.

## Scripts reference

| Script        | Purpose                                      |
|---------------|----------------------------------------------|
| `npm run db:push`    | Sync DB to match `schema.prisma` (no migrations) |
| `npm run db:migrate` | Create and apply a migration                 |
| `npm run db:generate` | Regenerate Prisma Client after schema change |

## Summary

- **Cause:** Schema and database were out of sync (e.g. new column in schema, not in DB).
- **Prevention:** After any change to `prisma/schema.prisma`, run `npm run db:push` (or use migrations) and ensure production DB is synced before or during deploy.
