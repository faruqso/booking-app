# Booking App

A self-serve, white-label booking platform for businesses.

## Current Status: Phase 3 Complete ✅

### Phase 1: MVP ✅
- Authentication (sign-in, sign-up, password reset)
- Business onboarding wizard
- Services management (CRUD with pricing, duration, categories)
- Customer-facing booking page (`/book/[businessId]`)
- Booking management (confirm, cancel, reschedule)
- Basic branding (logo, primary color, business name)

### Phase 2: Growth Features ✅
- Multi-location support with per-location availability
- Customer relationship management (CRM)
- Recurring bookings (daily, weekly, biweekly, monthly)
- Payment integration (Stripe, Paystack, Flutterwave)
- Enhanced branding (colors, fonts, favicon)
- Booking rules (advance booking, cancellation policy, buffers)
- Staff management with role-based access
- SMS notifications (Twilio)
- WhatsApp notifications (Cloud API)
- Localization (timezone, date/time formats, currencies)
- Full calendar view

### Phase 3: Refinement & Stability ✅
- Unified Settings page with consolidated tabs
- Sidebar UI/UX improvements
- Authentication stability across all environments
- AI-powered features (autocomplete, suggestions)
- Build & deployment automation

### Phase 4: Analytics & Integrations 🚧 (In Progress)
See [PHASE_4_ROADMAP.md](./PHASE_4_ROADMAP.md) for details:
- Analytics dashboard (revenue, bookings, customers)
- Customer self-service portal
- Google Calendar / Outlook integration
- Enhanced notification templates
- Waitlist and group bookings

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and API keys
```

3. Set up database:
```bash
npm run db:generate
npm run db:push
```

4. Run development server:
```bash
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Email**: Resend
- **Hosting**: Vercel (recommended)

## Database Setup

This app uses Prisma as the ORM. To set up your database:

1. Create a PostgreSQL database (use Supabase, Railway, Neon, or local PostgreSQL)
2. Update `DATABASE_URL` in `.env`
3. Run `npm run db:push` to create tables
4. Run `npm run db:generate` to generate Prisma client

**Recommended**: Use Neon (free tier) for production - see [DEPLOYMENT.md](./DEPLOYMENT.md) for details.

## Deployment

For detailed deployment instructions using free-tier services (Vercel + Neon + Resend), see [DEPLOYMENT.md](./DEPLOYMENT.md).

Quick deployment steps:
1. Set up Neon PostgreSQL database
2. Deploy to Vercel (connects to GitHub automatically)
3. Configure environment variables in Vercel
4. Set up Resend for email notifications

All services offer generous free tiers sufficient for Phase 1 MVP.

## Project Structure

```
/app                 - Next.js App Router pages
/components          - React components
/lib                 - Utilities and shared code
/prisma              - Database schema and migrations
/public              - Static assets
```

