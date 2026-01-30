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

## Phase-3 / Preview Branch (HTTP 405 on sign-in) – automated

For **preview** deployments (e.g. `phase-3`), you can set env vars **automatically** with a script (one-time token setup required).

### One-time: create a Vercel token

1. Go to **https://vercel.com/account/tokens**
2. Click **Create** and name the token (e.g. `booking-app-setup`)
3. Copy the token (you won’t see it again)

### Run the automated setup

**Option A – token in environment (recommended for one-off run)**

```bash
VERCEL_TOKEN=your_token_here npm run vercel:setup-preview-env
```

**Option B – token in `.env.local` (don’t commit this file)**

1. In the project root, create or edit `.env.local`
2. Add a line: `VERCEL_TOKEN=your_token_here`
3. Run:

```bash
npm run vercel:setup-preview-env
```

The script will:

- Ensure **NEXTAUTH_SECRET** exists for the **Preview** environment (generates one if missing)
- Optionally set **NEXTAUTH_URL** for Preview if you set `PREVIEW_BASE_URL` (e.g. your phase-3 URL)

**Optional env for the script**

- `VERCEL_PROJECT_NAME` – default `booking-app`
- `VERCEL_TEAM_ID` – required if the project is under a Vercel team
- `PREVIEW_BASE_URL` – e.g. `https://booking-app-git-phase-3-xxx.vercel.app` (optional; if unset, the app uses `VERCEL_URL` at runtime)

After running, redeploy the phase-3 (or any preview) deployment for the new env vars to apply.

### Manual alternative

If you prefer to set vars in the dashboard: **Vercel** → Your project → **Settings** → **Environment Variables** → ensure **NEXTAUTH_SECRET** (and optionally **NEXTAUTH_URL**) are set for **Preview**.

The NextAuth route is configured with `runtime = "nodejs"` and `dynamic = "force-dynamic"` so GET/POST to `/api/auth/signin` work on Vercel. If you still see 405, the cause is usually missing or wrong `NEXTAUTH_SECRET` / `NEXTAUTH_URL` for the Preview environment.

## Debug Mode

The app now has debug mode enabled on Vercel. Check Vercel function logs for detailed error messages.
