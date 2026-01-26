# 🆘 Help: Separate Development and Production Databases

## What You Need to Do Right Now

You're currently using a Neon database that might be shared between local and production. Let's fix this!

## Step-by-Step Instructions

### Step 1: Create a Development Database (2 minutes)

1. **Open Neon Dashboard**
   - Go to: https://console.neon.tech
   - Log in

2. **Create New Project**
   - Click the **"New Project"** or **"Create Project"** button
   - **Name**: `booking-app-dev` (or `booking-app-development`)
   - **Region**: Choose the same region as your production database
   - **PostgreSQL Version**: Latest (15+)
   - Click **"Create Project"**

3. **Copy Connection String**
   - After creation, you'll see a connection string
   - It will look like: `postgresql://neondb_owner:password@ep-xxx-xxx.region.neon.tech/neondb?sslmode=require`
   - **Click "Copy"** to copy the entire string
   - **Save this somewhere safe** - you'll need it in Step 2

### Step 2: Update Your Local .env File

1. **Open your `.env` file** (in the root of your project)

2. **Find this line:**
   ```
   DATABASE_URL="postgresql://neondb_owner:npg_Fuibog9p4hty@ep-fro..."
   ```

3. **Replace it with your NEW development database connection string:**
   ```
   DATABASE_URL="postgresql://neondb_owner:xxx@ep-dev-xxx.neon.tech/neondb?sslmode=require"
   ```
   (Use the connection string you copied in Step 1)

4. **Save the file**

### Step 3: Set Up Tables in Dev Database

Run this command:
```bash
npm run db:push
```

This creates all the tables in your development database.

### Step 4: Verify Vercel Uses Production Database

1. **Go to Vercel**: https://vercel.com/dashboard
2. **Select your project**: `booking-app`
3. **Go to**: Settings → Environment Variables
4. **Check `DATABASE_URL`**:
   - Should be set for **Production** environment
   - Should be your **PRODUCTION** database (the one you were using before)
   - Should be **DIFFERENT** from your local `.env` file

5. **If it's missing or wrong:**
   - Click "Add" or "Edit"
   - Environment: **Production**
   - Key: `DATABASE_URL`
   - Value: Your **production** Neon database connection string
   - Click "Save"

### Step 5: Test It Works

1. **Restart your dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Create test data:**
   - Go to http://localhost:3001
   - Sign up with a test account (e.g., test@example.com)
   - Create a test booking

3. **Verify separation:**
   - Go to your live site: https://booking-app-lemon-xi.vercel.app
   - Log in with a real account
   - **The test data should NOT appear here!**

### Step 6: Verify Setup

Run this command:
```bash
npm run check:db
```

You should see:
```
✅ Using development/test database - Safe for development
```

## Quick Checklist

- [ ] Created new Neon project named `booking-app-dev`
- [ ] Copied the development database connection string
- [ ] Updated local `.env` file with dev database URL
- [ ] Ran `npm run db:push` successfully
- [ ] Verified Vercel has production database URL (different from local)
- [ ] Tested: Created test data locally, confirmed it doesn't appear in production
- [ ] Ran `npm run check:db` and got ✅ confirmation

## What This Fixes

✅ Local testing won't affect real users
✅ Test data stays in development
✅ Production data is safe
✅ You can test freely without worry

## Still Need Help?

Tell me:
1. Which step are you on?
2. Do you have access to Neon dashboard?
3. Any error messages you're seeing?
