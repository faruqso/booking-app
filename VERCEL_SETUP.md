# Quick Vercel Setup Guide

## ✅ Already Completed:
- ✅ Neon database connected: `fragrant-rice-08858523`
- ✅ GitHub repository created: `https://github.com/faruqso/booking-app`
- ✅ Code pushed to GitHub
- ✅ NEXTAUTH_SECRET generated: `z7UA0Y8vHNhGwjKyJX4Sn/xa0R3YZC59HFYCwF+aIBw=`

## 🚀 Next Steps (5 minutes):

### Step 1: Create Vercel Project (2 minutes)
1. Go to: **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select: **`faruqso/booking-app`**
4. Click **"Import"**
5. Configure:
   - **Project Name**: `booking-app` (auto-filled)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run vercel-build` (auto-detected)
   - **Output Directory**: `.next` (default)
6. **DO NOT deploy yet** - we need to add environment variables first
7. Click **"Cancel"** or navigate to project settings

### Step 2: Add Environment Variables (2 minutes)
1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add each variable below for **Production**, **Preview**, and **Development**:

```
DATABASE_URL=postgresql://neondb_owner:npg_Fuibog9p4hty@ep-frosty-cherry-a4skop9z-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require

NEXTAUTH_URL=https://booking-app.vercel.app
NEXTAUTH_SECRET=z7UA0Y8vHNhGwjKyJX4Sn/xa0R3YZC59HFYCwF+aIBw=
NEXT_PUBLIC_APP_URL=https://booking-app.vercel.app

RESEND_API_KEY=your-resend-api-key-here
RESEND_FROM_EMAIL=onboarding@resend.dev

NODE_ENV=production
```

**Note**: After first deployment, update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with your actual Vercel URL (might be `booking-app-xxx.vercel.app`)

### Step 3: Deploy (1 minute)
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment, or
3. Push a new commit to trigger deployment:
   ```bash
   git commit --allow-empty -m "Trigger Vercel deployment"
   git push
   ```

### Step 4: Update URLs (after first deploy)
1. Copy your Vercel deployment URL (e.g., `https://booking-app-abc123.vercel.app`)
2. Update environment variables:
   - `NEXTAUTH_URL` = your Vercel URL
   - `NEXT_PUBLIC_APP_URL` = your Vercel URL
3. Redeploy

## 📧 Resend Setup (After Vercel):
1. Go to: **https://resend.com**
2. Sign up/login
3. Go to **API Keys** → **Create API Key**
4. Copy the API key
5. Add to Vercel environment variables as `RESEND_API_KEY`
6. For production, configure sender domain (optional for now, `onboarding@resend.dev` works)

## ✅ Verification Checklist:
- [ ] Vercel project created
- [ ] Environment variables added
- [ ] First deployment successful
- [ ] URLs updated after first deploy
- [ ] Resend API key added
- [ ] Test signup/login
- [ ] Test booking flow
- [ ] Test email notifications

## 🐛 Troubleshooting:
- **Build fails**: Check build logs in Vercel dashboard
- **Database connection error**: Verify `DATABASE_URL` is correct
- **Auth errors**: Ensure `NEXTAUTH_URL` matches your Vercel domain
- **Email not sending**: Verify `RESEND_API_KEY` is set correctly

