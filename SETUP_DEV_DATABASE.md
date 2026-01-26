# Step-by-Step: Set Up Development Database

## Current Situation
You're using the same database for local development and production, which is dangerous.

## Solution: Create Separate Databases

### Step 1: Create Development Database on Neon

1. **Go to Neon Dashboard**
   - Visit: https://console.neon.tech
   - Log in to your account

2. **Create New Project**
   - Click "Create Project" button
   - Project name: `booking-app-dev` (or `booking-app-development`)
   - Region: Choose same as production (for consistency)
   - PostgreSQL version: Latest (15+)
   - Click "Create Project"

3. **Get Connection String**
   - After creation, you'll see the connection string
   - It looks like: `postgresql://neondb_owner:password@ep-xxx-xxx.region.neon.tech/neondb?sslmode=require`
   - **Copy this entire string** - this is your DEV database

### Step 2: Update Your Local .env File

1. **Open your `.env` file** in the project root
2. **Find the line** that says `DATABASE_URL=...`
3. **Replace it** with your new development database connection string
4. **Save the file**

Example:
```env
# OLD (if this is your production database, REMOVE IT!)
# DATABASE_URL="postgresql://neondb_owner:xxx@ep-prod-xxx.neon.tech/neondb"

# NEW (your development database)
DATABASE_URL="postgresql://neondb_owner:xxx@ep-dev-xxx.neon.tech/neondb?sslmode=require"
```

### Step 3: Set Up Schema in Dev Database

Run this command to create all tables in your dev database:
```bash
npm run db:push
```

This will:
- Connect to your dev database
- Create all tables (users, businesses, bookings, etc.)
- Set up all relationships

### Step 4: Verify Vercel Uses Production Database

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project: `booking-app`

2. **Check Environment Variables**
   - Go to: Settings → Environment Variables
   - Find `DATABASE_URL`
   - **Verify it's set for Production only**
   - **Verify it's your PRODUCTION database** (different from local)

3. **If Not Set or Wrong:**
   - Click "Add" or "Edit"
   - Environment: Select **Production** only
   - Key: `DATABASE_URL`
   - Value: Your **production** Neon database connection string
   - Click "Save"

### Step 5: Test the Separation

1. **Create test data locally:**
   ```bash
   # Start your dev server
   npm run dev
   
   # Go to http://localhost:3001
   # Sign up with a test account
   # Create a test booking
   ```

2. **Verify it doesn't appear in production:**
   - Go to your live site: https://booking-app-lemon-xi.vercel.app
   - Log in with a real account
   - Verify the test data is NOT there

### Step 6: Verify Setup

Run this command to check:
```bash
npm run check:db
```

It should say:
- ✅ "Using development/test database - Safe for development"

## Quick Checklist

- [ ] Created new Neon project for development
- [ ] Updated local `.env` with dev database URL
- [ ] Ran `npm run db:push` to set up dev database
- [ ] Verified Vercel has production database URL (different from local)
- [ ] Tested: Created test data locally, verified it doesn't appear in production
- [ ] Ran `npm run check:db` and got ✅ confirmation

## Need Help?

If you're stuck:
1. Share the first part of your DATABASE_URL (I can help identify if it's dev or prod)
2. Check if you have access to Neon dashboard
3. Let me know which step you're on
