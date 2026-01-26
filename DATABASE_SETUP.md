# Database Setup - Development vs Production

## ⚠️ CRITICAL: Separate Databases Required

**Your local development should NEVER use the production database!**

## Current Problem

If your local `.env` file uses the same `DATABASE_URL` as production, then:
- ❌ Local testing affects real user data
- ❌ Test bookings appear in production
- ❌ Database changes can break production
- ❌ Data corruption risk

## Solution: Separate Databases

### 1. Create a Development Database

**Option A: Neon (Recommended)**
1. Go to https://neon.tech
2. Create a NEW project (e.g., "booking-app-dev")
3. Copy the connection string
4. Use this for local development

**Option B: Local PostgreSQL**
1. Install PostgreSQL locally
2. Create a database: `booking_app_dev`
3. Connection string: `postgresql://user:password@localhost:5432/booking_app_dev`

### 2. Update Your Local `.env` File

```bash
# Development Database (Local Testing)
DATABASE_URL="postgresql://user:password@dev-db-host/database?sslmode=require"

# Production Database (Vercel)
# This should ONLY be set in Vercel environment variables
# NEVER commit this to your code
```

### 3. Vercel Environment Variables

In Vercel Dashboard → Settings → Environment Variables:
- Set `DATABASE_URL` for **Production** only
- Use your production Neon database connection string
- Do NOT set it for Preview/Development environments

### 4. Environment-Specific Configuration

The app automatically uses:
- **Local**: `.env` file → Development database
- **Vercel Production**: Environment variables → Production database
- **Vercel Preview**: Environment variables → Can use dev database for testing

## Quick Setup Steps

1. **Create Dev Database**:
   ```bash
   # If using Neon, create a new project
   # If using local PostgreSQL:
   createdb booking_app_dev
   ```

2. **Update Local `.env`**:
   ```bash
   DATABASE_URL="your-dev-database-url"
   ```

3. **Run Migrations on Dev DB**:
   ```bash
   npm run db:push
   # or
   npx prisma migrate dev
   ```

4. **Verify Separation**:
   - Check local `.env` has dev database
   - Check Vercel has production database
   - Test: Create test data locally, verify it doesn't appear in production

## Best Practices

1. ✅ **Always use separate databases**
2. ✅ **Never commit `.env` files**
3. ✅ **Use different database names** (e.g., `booking_app_dev` vs `booking_app_prod`)
4. ✅ **Test database migrations on dev first**
5. ✅ **Use database branching** (Neon feature) for safe testing

## Emergency: If You've Already Mixed Data

If you've already created test data in production:

1. **Backup production database** immediately
2. **Create separate dev database** (follow steps above)
3. **Clean up test data** from production if needed
4. **Update local `.env`** to use dev database
5. **Verify separation** before continuing development
