# 🚨 URGENT: Fix Database Separation

## The Problem

You're currently using the **same database** for local development and production. This means:
- ❌ Local testing affects real user data
- ❌ Test bookings appear in production
- ❌ You could accidentally delete real user data
- ❌ Database changes can break production

## Immediate Action Required

### Step 1: Create a Development Database (5 minutes)

**Option A: Neon (Easiest)**
1. Go to https://neon.tech
2. Click "Create Project"
3. Name it: `booking-app-dev` (or similar)
4. Copy the connection string
5. This is your **development database**

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL if needed
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb booking_app_dev

# Connection string will be:
# postgresql://your-username@localhost:5432/booking_app_dev
```

### Step 2: Update Your Local `.env` File

1. Open your `.env` file (in project root)
2. Find `DATABASE_URL`
3. Replace it with your **development database** connection string
4. Save the file

**Example:**
```env
# OLD (Production - REMOVE THIS!)
# DATABASE_URL="postgresql://prod-user@prod-host/database"

# NEW (Development - USE THIS!)
DATABASE_URL="postgresql://dev-user@dev-host/booking_app_dev?sslmode=require"
```

### Step 3: Run Migrations on Dev Database

```bash
# This will create all tables in your dev database
npm run db:push
```

### Step 4: Verify Separation

1. **Check your local `.env`** - Should have dev database
2. **Check Vercel Dashboard** - Should have production database
3. **Test**: Create a test booking locally, verify it doesn't appear in production

### Step 5: Clean Up (If Needed)

If you've already created test data in production:
1. **Backup production database first!**
2. Manually delete test data from production (if any)
3. Continue using separate databases going forward

## Verification

Run this command to check your setup:
```bash
npm run check:db
```

This will warn you if you're using a production database locally.

## Going Forward

- ✅ **Always** use separate databases
- ✅ **Never** commit `.env` files
- ✅ **Test** database changes on dev first
- ✅ **Verify** separation before deploying

## Need Help?

If you're unsure which database you're using:
1. Check your local `.env` file
2. Check Vercel Dashboard → Settings → Environment Variables
3. They should be DIFFERENT!
