# Deployment Checklist

Use this checklist when deploying to production.

## Pre-Deployment

- [ ] Code is pushed to GitHub
- [ ] `.env.example` file exists (see DEPLOYMENT.md for content)
- [ ] Build succeeds locally (`npm run build`)
- [ ] All features tested locally
- [ ] Database schema is finalized

## Step 1: Neon Database Setup

- [ ] Created Neon account at https://neon.tech
- [ ] Created new project
- [ ] Selected region closest to users
- [ ] Copied connection string
- [ ] Connection string includes `?sslmode=require`
- [ ] Tested connection locally (optional):
  ```bash
  export DATABASE_URL="your-neon-connection-string"
  npm run db:push
  ```

## Step 2: Resend Email Setup

- [ ] Created Resend account at https://resend.com
- [ ] Verified email address
- [ ] Created API key
- [ ] Copied API key (starts with `re_`)
- [ ] API key has "Sending access" permission

## Step 3: Vercel Deployment

- [ ] Created Vercel account at https://vercel.com
- [ ] Connected GitHub account
- [ ] Imported repository
- [ ] Configured project settings:
  - [ ] Framework: Next.js (auto-detected)
  - [ ] Build Command: `npm run vercel-build`
  - [ ] Root Directory: `./`
- [ ] Set environment variables in Vercel:
  - [ ] `DATABASE_URL` (from Neon)
  - [ ] `NEXTAUTH_URL` (will update after first deploy)
  - [ ] `NEXTAUTH_SECRET` (generated with `./scripts/generate-secret.sh`)
  - [ ] `RESEND_API_KEY` (from Resend)
  - [ ] `NEXT_PUBLIC_APP_URL` (same as NEXTAUTH_URL)
- [ ] Set variables for Production, Preview, and Development environments
- [ ] Clicked "Deploy"
- [ ] Build completed successfully
- [ ] Noted the Vercel URL: `https://your-project.vercel.app`

## Step 4: Post-Deployment Configuration

- [ ] Updated `NEXTAUTH_URL` in Vercel with actual URL
- [ ] Updated `NEXT_PUBLIC_APP_URL` in Vercel with actual URL
- [ ] Redeployed (or pushed new commit to trigger redeploy)

## Step 5: Verification

### Functional Tests
- [ ] Homepage loads
- [ ] Sign up works
- [ ] Sign in works
- [ ] Dashboard accessible
- [ ] Can create services
- [ ] Can create bookings
- [ ] Email notifications work
- [ ] Password reset works

### Performance Tests
- [ ] Page load < 2 seconds
- [ ] API responses < 500ms

### Security Checks
- [ ] HTTPS enabled (automatic)
- [ ] Environment variables not exposed
- [ ] Database uses SSL (automatic)

## Post-Deployment

- [ ] Monitored Vercel logs for errors
- [ ] Checked Neon dashboard for connection issues
- [ ] Verified Resend dashboard shows email activity
- [ ] Documented any custom configurations
- [ ] Shared deployment URL with team

## Troubleshooting Resources

- Full guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Quick reference: [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)
- Generate secret: `./scripts/generate-secret.sh`
- Check env vars: `./scripts/check-env.sh`

