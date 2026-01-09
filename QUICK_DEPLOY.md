# Quick Deployment Reference

## TL;DR - Deploy in 5 Steps

1. **Neon Database** (5 min)
   - Sign up at https://neon.tech
   - Create project → Copy connection string

2. **Resend Email** (2 min)
   - Sign up at https://resend.com
   - Create API key → Copy key

3. **Vercel Deployment** (5 min)
   - Connect GitHub repo at https://vercel.com
   - Add environment variables:
     - `DATABASE_URL` (from Neon)
     - `NEXTAUTH_URL` (will be your Vercel URL)
     - `NEXTAUTH_SECRET` (run `./scripts/generate-secret.sh`)
     - `RESEND_API_KEY` (from Resend)
     - `NEXT_PUBLIC_APP_URL` (same as NEXTAUTH_URL)
   - Deploy!

4. **Update URLs** (1 min)
   - After first deploy, update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with actual Vercel URL
   - Redeploy

5. **Test** (5 min)
   - Test signup, login, booking flow
   - Verify emails are sending

## Environment Variables Checklist

Copy this checklist when setting up Vercel:

- [ ] `DATABASE_URL` - Neon connection string
- [ ] `NEXTAUTH_URL` - Your Vercel URL (https://your-app.vercel.app)
- [ ] `NEXTAUTH_SECRET` - Generated secret (use `./scripts/generate-secret.sh`)
- [ ] `RESEND_API_KEY` - Resend API key (starts with `re_`)
- [ ] `NEXT_PUBLIC_APP_URL` - Same as NEXTAUTH_URL

## Free Tier Limits

- **Vercel**: 100GB bandwidth/month ✅
- **Neon**: 0.5GB storage ✅
- **Resend**: 3,000 emails/month ✅

**Total Cost: $0/month**

## Troubleshooting

**Build fails?**
- Check Vercel build logs
- Verify all environment variables are set
- Ensure DATABASE_URL includes `?sslmode=require`

**Can't sign in?**
- Verify NEXTAUTH_URL matches your actual Vercel URL exactly
- Check NEXTAUTH_SECRET is set

**Emails not sending?**
- Verify RESEND_API_KEY is correct
- Check Resend dashboard for errors
- App uses `onboarding@resend.dev` by default (no verification needed)

## Full Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

