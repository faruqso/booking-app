# Deployment Guide

This guide walks you through deploying the Booking App to production using free-tier services.

## Prerequisites

- GitHub account (for repository hosting)
- Neon account (for PostgreSQL database)
- Vercel account (for hosting)
- Resend account (for email)

## Step 1: Database Setup (Neon)

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up with GitHub (recommended) or email
   - Free tier is automatically enabled

2. **Create Project**
   - Click "Create Project"
   - Choose region closest to your users
   - Project name: `booking-app` (or your choice)
   - PostgreSQL version: Latest (15+)

3. **Get Connection String**
   - After project creation, copy the connection string
   - Format: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`
   - **Save this for Step 3** - you'll need it for Vercel environment variables

4. **Run Database Schema Setup (Optional - Recommended)**
   ```bash
   # Set DATABASE_URL environment variable
   export DATABASE_URL="your-neon-connection-string"
   
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to production database
   npm run db:push
   ```
   
   **Note**: The `vercel-build` script will generate Prisma client automatically. For initial setup, it's recommended to run `db:push` locally first to verify the connection works.

## Step 2: Prepare Repository

1. **Create .env.example file** (if it doesn't exist)
   Create a `.env.example` file in the root directory with the following content:
   ```env
   # Database - Replace with your Neon connection string
   DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3001"
   NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"
   
   # Resend Email (get from https://resend.com)
   RESEND_API_KEY="re_your_api_key_here"
   RESEND_FROM_EMAIL="Bookings <onboarding@resend.dev>"
   
   # App
   NEXT_PUBLIC_APP_URL="http://localhost:3001"
   ```

2. **Ensure code is pushed to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

3. **Verify .gitignore includes .env files**
   - Ensure `.gitignore` includes `.env` and `.env.local`
   - The `.env.example` file should be committed (it's safe, contains no secrets)

## Step 3: Vercel Deployment

1. **Connect to Vercel**
   - Go to https://vercel.com
   - Sign up/login with GitHub
   - Click "Add New Project"
   - Import your repository

2. **Configure Project**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run vercel-build` (uses our custom script)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

3. **Set Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add each variable for **Production**, **Preview**, and **Development**:
   
   **Required Variables:**
   - `DATABASE_URL` - Your Neon connection string from Step 1
   - `NEXTAUTH_URL` - Will be `https://your-project.vercel.app` (update after first deploy)
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32` or use `./scripts/generate-secret.sh`
   - `RESEND_API_KEY` - From Resend dashboard (Step 4)
   - `NEXT_PUBLIC_APP_URL` - Same as NEXTAUTH_URL
   
   **Helper Scripts:**
   - Use `./scripts/generate-secret.sh` to generate NEXTAUTH_SECRET
   - Use `./scripts/check-env.sh` to verify all environment variables are set (for local testing)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Vercel will provide URL: `https://your-project.vercel.app`

5. **Update NEXTAUTH_URL**
   - After first deployment, note your actual Vercel URL
   - Go back to Environment Variables in Vercel
   - Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with the actual URL
   - Redeploy (or wait for next push to trigger redeploy)

## Step 4: Resend Email Setup

1. **Create Resend Account**
   - Go to https://resend.com
   - Sign up (free tier automatically enabled)
   - Verify email address

2. **Get API Key**
   - Go to API Keys section
   - Click "Create API Key"
   - Name: `booking-app-production`
   - Permission: "Sending access"
   - Copy the key (starts with `re_`)

3. **Configure in Vercel**
   - Go to Vercel project → Settings → Environment Variables
   - Add `RESEND_API_KEY` with your Resend API key
   - Set for all environments (Production, Preview, Development)

4. **Email Configuration**
   - The app is already configured to use `onboarding@resend.dev` as default
   - No domain verification needed for test domain
   - For production with custom domain, update `RESEND_FROM_EMAIL` in environment variables

## Step 5: Post-Deployment Verification

### Functional Testing Checklist

- [ ] Homepage loads correctly
- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] Dashboard accessible after login
- [ ] Services can be created
- [ ] Bookings can be created
- [ ] Email notifications sent successfully
- [ ] Password reset works
- [ ] All API routes respond correctly

### Performance Testing

- [ ] Page load times < 2 seconds
- [ ] API responses < 500ms
- [ ] Database queries optimized

### Security Checklist

- [ ] Environment variables not exposed in client-side code
- [ ] API routes protected with authentication where needed
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Database connection uses SSL (automatic with Neon)

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` includes `?sslmode=require`
- Check Neon project is active
- Verify connection string format

### Authentication Redirect Issues
- Ensure `NEXTAUTH_URL` matches actual Vercel URL exactly
- Check `NEXTAUTH_SECRET` is set
- Verify callback URLs in NextAuth config

### Email Not Sending
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for errors
- Ensure using test domain `onboarding@resend.dev` for development

### Build Failures
- Check Vercel build logs
- Verify all dependencies in `package.json`
- Ensure environment variables are set
- Check Prisma migrations run successfully

## Monitoring

### Vercel Dashboard
- View function logs
- Monitor deployments
- Check analytics

### Neon Dashboard
- Monitor database usage
- View query performance
- Check connection status

### Resend Dashboard
- Monitor email delivery
- View email statistics
- Check for bounces/complaints

## Cost Breakdown (Free Tier)

| Service | Free Tier Limit | Phase 1 Sufficiency |
|---------|----------------|---------------------|
| Vercel | 100GB bandwidth/month | ✅ Sufficient for 1000s of users |
| Neon | 0.5GB storage | ✅ Sufficient for Phase 1 |
| Resend | 3,000 emails/month | ✅ Sufficient for ~100 bookings/month |
| **Total Cost** | **$0/month** | ✅ |

## Database Schema Updates

**Current Setup (Using db:push):**

The project currently uses `prisma db push` for schema updates. This is fine for Phase 1 MVP.

**For Production Schema Updates:**

1. **Update Schema Locally**
   ```bash
   # Make schema changes in prisma/schema.prisma
   # Test locally
   npm run dev
   ```

2. **Push to Production**
   ```bash
   # Set production DATABASE_URL
   export DATABASE_URL="your-production-neon-connection-string"
   
   # Push schema changes
   npm run db:push
   
   # Generate Prisma client
   npm run db:generate
   ```

**Future: Migrating to Prisma Migrations (Recommended for Phase 2+)**

For better migration tracking, you can initialize Prisma migrations:

```bash
# Initialize migrations (one-time setup)
npx prisma migrate dev --name init

# Then update vercel-build script in package.json to:
# "vercel-build": "prisma migrate deploy && prisma generate && next build"
```

**Note**: The current `vercel-build` script only generates Prisma client. Schema changes should be pushed manually using `db:push` until migrations are initialized.

## Step 6: AI Gateway Setup (Optional - Post-Funding)

When you're ready to enable paid tier AI features:

1. **Set up AI Gateway** (see `docs/AI_GATEWAY_SETUP.md` for detailed instructions):
   - Create API key in Vercel dashboard → AI Gateway
   - Configure budgets per tier (Starter: $5/mo, Professional: $20/mo, Enterprise: $100/mo)
   - Set up provider fallbacks (OpenAI → Anthropic)
   - Configure monitoring dashboards

2. **Authentication**:
   - **Development**: Add `AI_GATEWAY_API_KEY` to local `.env`
   - **Production**: Run `vercel link` and `vercel env pull` for OIDC token

3. **Test AI Features**:
   - Service description generation: `/api/ai/generate-description`
   - Semantic autocomplete: `/api/ai/semantic-autocomplete`
   - Booking summaries: `/api/ai/booking-summary`

## Next Steps

After successful deployment:
1. Test all features thoroughly
2. Set up monitoring alerts
3. Document any custom configurations
4. Plan for scaling when needed
5. (Post-funding) Set up AI Gateway for paid tier features

