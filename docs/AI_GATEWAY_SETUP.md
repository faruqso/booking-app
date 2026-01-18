# AI Gateway Setup Guide

This guide covers setting up Vercel AI Gateway for paid tier AI features.

## Prerequisites

- Vercel project deployed
- Funding secured (for paid tier features)
- Vercel CLI installed (for production setup)

## Step 1: Authentication Setup

### Development Environment (API Key)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **AI Gateway**
3. Click **Create API Key**
4. Copy the API key
5. Add to your local `.env` file:
   ```env
   AI_GATEWAY_API_KEY=your_api_key_here
   ```

### Production Environment (OIDC Token)

1. Link your project (if not already linked):
   ```bash
   vercel link
   ```

2. Pull environment variables (includes auto-refreshing OIDC token):
   ```bash
   vercel env pull
   ```

3. The OIDC token is automatically managed by Vercel and refreshes every 12 hours.

## Step 2: Configure Budgets in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **AI Gateway** → **Budgets**
3. Create budgets for each tier:

   **Starter Tier:**
   - Budget: $5/month
   - Alert at: $4 (80% of budget)

   **Professional Tier:**
   - Budget: $20/month
   - Alert at: $16 (80% of budget)

   **Enterprise Tier:**
   - Budget: $100/month
   - Alert at: $80 (80% of budget)

4. Configure budget enforcement:
   - Enable automatic blocking when budget exceeded
   - Set up email alerts for budget warnings

## Step 3: Configure Provider Fallbacks

1. Go to **AI Gateway** → **Providers**
2. Configure fallback chain for critical features:

   **For Chatbot and Critical Features:**
   - Primary: OpenAI GPT-3.5-turbo
   - Fallback 1: Anthropic Claude Sonnet
   - Fallback 2: (Optional) Google Gemini

   **For Simple Tasks:**
   - Primary: OpenAI GPT-3.5-turbo
   - Fallback: Anthropic Claude Sonnet (only if needed)

3. Set fallback triggers:
   - Error rate > 5%
   - Response time > 5 seconds
   - Rate limit exceeded (429)

## Step 4: Set Up Monitoring Dashboards

1. Go to **AI Gateway** → **Analytics**
2. Create custom dashboards for:
   - **Cost Tracking**: Monitor spending per business tier
   - **Usage Metrics**: Track API calls, tokens used, requests per day
   - **Performance**: Response times, error rates, fallback usage
   - **Provider Health**: Uptime, success rates per provider

3. Set up alerts:
   - Budget exceeded (80% threshold)
   - High error rate (> 5%)
   - Provider downtime
   - Unusual usage patterns

## Step 5: Test the Integration

1. **Test API Key Authentication (Development):**
   ```bash
   # Set API key in .env
   AI_GATEWAY_API_KEY=your_key_here
   
   # Test service description generation
   curl -X POST http://localhost:3001/api/ai/generate-description \
     -H "Content-Type: application/json" \
     -d '{"serviceName": "Haircut", "category": "Beauty & Wellness"}'
   ```

2. **Test OIDC Token (Production):**
   ```bash
   # After vercel env pull, test in production
   # The OIDC token is automatically used
   ```

## Step 6: Verify Fallback Behavior

1. Test with a provider that's temporarily unavailable
2. Verify automatic fallback to secondary provider
3. Check logs to confirm fallback usage

## Code Implementation

The fallback logic is already implemented in:
- `lib/ai/gateway-wrapper.ts` - Automatic fallback (OpenAI → Anthropic)
- `lib/ai/gateway-client.ts` - Provider configuration

## Budget Enforcement

Budgets are enforced at two levels:

1. **Pre-check** (in code): `lib/ai/budget-manager.ts` checks budget before making Gateway calls
2. **Gateway-level**: Vercel AI Gateway automatically blocks requests when budget exceeded

## Monitoring

Access monitoring dashboards:
- Vercel Dashboard → AI Gateway → Analytics
- View real-time usage, costs, and performance metrics
- Export reports for business analysis

## Troubleshooting

### "AI Gateway is not configured"
- Ensure `AI_GATEWAY_API_KEY` is set in `.env` (development)
- Or run `vercel env pull` (production)

### "Budget exceeded" errors
- Check budget limits in Vercel dashboard
- Verify business tier assignment
- Review usage in Analytics dashboard

### Fallbacks not working
- Verify provider configuration in Vercel dashboard
- Check fallback triggers are set correctly
- Review error logs for fallback attempts

## Next Steps

After setup:
1. Monitor usage for first week
2. Adjust budgets based on actual usage
3. Optimize provider routing based on performance data
4. Set up automated reports for business owners
