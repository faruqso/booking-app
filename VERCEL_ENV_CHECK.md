# Vercel Environment Variables Checklist

## Critical Issue: Mobile Login Failing

The "page isn't working" error on mobile login is likely due to missing or incorrect environment variables on Vercel.

## Required Environment Variables

Go to your Vercel project settings → Environment Variables and ensure these are set:

### 1. **NEXTAUTH_SECRET** (CRITICAL)
- **Required**: Yes
- **How to generate**: Run `openssl rand -base64 32` in terminal
- **Example**: `z7UA0Y8vHNhGwjKyJX4Sn/xa0R3YZC59HFYCwF+aIBw=`
- **Set for**: Production, Preview, Development

### 2. **NEXTAUTH_URL** (CRITICAL)
- **Required**: Yes
- **Value**: `https://booking-app-lemon-xi.vercel.app` (your actual Vercel URL)
- **Set for**: Production, Preview, Development
- **Note**: Must match your actual Vercel domain exactly

### 3. **DATABASE_URL** (CRITICAL)
- **Required**: Yes
- **Value**: Your Neon PostgreSQL connection string
- **Format**: `postgresql://user:password@host:port/database?sslmode=require`
- **Set for**: Production, Preview, Development

### 4. **NEXT_PUBLIC_APP_URL** (IMPORTANT)
- **Required**: Recommended
- **Value**: Same as NEXTAUTH_URL
- **Set for**: Production, Preview, Development

## Quick Fix Steps

1. **Check Vercel Dashboard**:
   - Go to: https://vercel.com/dashboard
   - Select your project: `booking-app`
   - Go to: Settings → Environment Variables

2. **Verify NEXTAUTH_SECRET**:
   ```bash
   # Generate a new secret if needed
   openssl rand -base64 32
   ```
   - Copy the output
   - Add/Update in Vercel as `NEXTAUTH_SECRET`

3. **Verify NEXTAUTH_URL**:
   - Should be: `https://booking-app-lemon-xi.vercel.app`
   - Or check your actual Vercel URL from the dashboard

4. **Redeploy**:
   - After updating environment variables, trigger a new deployment
   - Or push a new commit to trigger auto-deploy

## Testing After Fix

1. Clear browser cache on mobile
2. Try logging in again
3. Check browser console for errors (if possible)
4. Check Vercel function logs for errors

## Common Issues

- **"Page isn't working"**: Usually NEXTAUTH_SECRET missing
- **"Configuration error"**: NEXTAUTH_URL incorrect
- **"Database error"**: DATABASE_URL incorrect or connection issue
- **"Access denied"**: Session/cookie issues (check secure cookie settings)

## Debug Mode

The app now has debug mode enabled on Vercel. Check Vercel function logs for detailed error messages.
