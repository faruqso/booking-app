# Neon Database Connection Guide

## Why Database Connection Errors Happen

### Neon Free Tier Auto-Pause
- **Neon free tier databases automatically pause after ~5 minutes of inactivity**
- When paused, the database is unreachable until woken up
- First connection attempt after pause will fail
- Subsequent attempts usually succeed once the database wakes up

### Connection String Types
Your `.env` uses Neon's **pooler** endpoint:
```
postgresql://...@ep-frosty-cherry-a4skop9z-pooler.us-east-1.aws.neon.tech/...
```

**Pooler benefits:**
- Better connection management
- Handles connection pooling automatically
- Still pauses, but wakes faster

## Will This Happen on Vercel?

### Short Answer: **Yes, but less frequently**

### Why It Happens on Vercel:
1. **Same Database**: Vercel uses the same `DATABASE_URL` from environment variables
2. **Auto-Pause**: Neon still pauses after inactivity, even with production traffic
3. **Cold Starts**: If your Vercel function hasn't been called in a while, the first request might hit a paused database

### Why It's Less Common on Vercel:
1. **More Traffic**: Production apps typically have more regular traffic, keeping the database awake
2. **Health Checks**: Vercel's health checks can keep the database active
3. **Retry Logic**: The code now includes retry logic (2 attempts with 1-second delay)

## Solutions

### Option 1: Upgrade Neon Plan (Recommended for Production)
- **Paid Neon plans** don't auto-pause
- **Starter plan** ($19/month) keeps database always-on
- Best for production apps with real users

### Option 2: Keep Free Tier (Development/Testing)
- Accept occasional wake-up delays
- Use retry logic (already implemented)
- Monitor and wake database manually when needed

### Option 3: Use Neon's Auto-Wake Feature
- Neon can auto-wake on first connection attempt
- May add 2-5 seconds delay to first request
- Already handled by retry logic in code

## Current Implementation

### Retry Logic
The authentication flow now includes:
- **2 connection attempts** with 1-second delay between retries
- Helps with Neon wake-up delays
- Logs connection attempts for debugging

### Error Messages
- Clear user-facing error messages
- Instructions to wake Neon database if needed
- Debug mode shows detailed errors in development

## Best Practices

### For Development:
1. Keep Neon dashboard open: `console.neon.tech`
2. Wake database before testing if it's been idle
3. Use retry logic (already implemented)

### For Production:
1. **Upgrade to paid Neon plan** (recommended)
2. Set up monitoring/alerts for database connection issues
3. Consider connection pooling (already using pooler endpoint)
4. Monitor Vercel function logs for connection errors

## Monitoring

### Check Database Status:
- Neon Dashboard: `console.neon.tech`
- Look for "Paused" status
- Check connection metrics

### Check Application Logs:
- Vercel logs: Dashboard → Your Project → Functions → Logs
- Look for `[AUTH] Database connection failed` messages
- Monitor retry attempts

## Environment Variables

### Development (.env):
```env
DATABASE_URL="postgresql://...@ep-xxx-pooler.us-east-1.aws.neon.tech/..."
```

### Production (Vercel):
- Set `DATABASE_URL` in Vercel dashboard
- Use same Neon connection string
- Consider using Neon's direct connection (non-pooler) for production if needed

## Troubleshooting

### Error: "Can't reach database server"
1. Check Neon dashboard - is database paused?
2. Wake database manually
3. Wait 10-20 seconds
4. Try again

### Error: "P1001" or "P1000"
- Prisma connection error codes
- Usually means database is unreachable
- Check Neon dashboard status

### First Request Slow on Vercel
- Normal behavior - database waking up
- Retry logic handles this automatically
- Consider upgrading Neon plan for production
