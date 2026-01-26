# Payment Setup Guide

## Overview
This guide explains how to configure payments for your booking system, including what's needed for testing and production.

## What Was Fixed

### 1. **Payment API Public Access**
- **Issue**: Payment API required authentication, but customers don't have sessions
- **Fix**: Payment API now allows public access for customer bookings (validated via booking ID)
- **Security**: Booking ID validation ensures only valid bookings can create payments

### 2. **Payment Configuration Validation**
- **Issue**: Bookings could fail if payment was required but not properly configured
- **Fix**: Added validation to check payment keys before allowing bookings
- **Result**: Clear error messages when payment configuration is incomplete

### 3. **Improved Payments Page UX**
- Added status overview card showing current payment mode (Test/Production)
- Added test/production indicators for API keys
- Added copy buttons for webhook URLs
- Added comprehensive setup guides
- Added troubleshooting section

## Configuration Requirements

### For Testing Phase 🧪

**What You Need:**
1. **Test API Keys** from your payment provider:
   - Stripe: `pk_test_...` and `sk_test_...`
   - Paystack: `pk_test_...` and `sk_test_...`
   - Flutterwave: `FLWPUBK_TEST_...` and `FLWSECK_TEST_...`

2. **Test Webhook URL** configured in provider dashboard:
   - URL: `https://your-domain.com/api/webhooks/{provider}`
   - Copy the webhook URL from the payments page (use the copy button)

3. **Test Card Numbers** (for testing payments):
   - **Stripe**: `4242 4242 4242 4242` (any future date, any CVC)
   - **Paystack**: `4084 0840 8408 4081` (any future date, any CVV)
   - **Flutterwave**: `5531 8866 5214 2950` (any future date, any CVV)

**Setup Steps:**
1. Go to `/dashboard/payments`
2. Select your payment provider (Stripe, Paystack, or Flutterwave)
3. Enter your **test** API keys
4. Enable "Require Payment at Booking"
5. Set deposit percentage (optional, leave empty for full payment)
6. Copy the webhook URL and add it to your provider's dashboard
7. Test a booking with a test card number

**Important**: Test mode doesn't charge real money. Perfect for development!

### For Production Phase 🚀

**What You Need:**
1. **Live/Production API Keys**:
   - Stripe: `pk_live_...` and `sk_live_...`
   - Paystack: `pk_live_...` and `sk_live_...`
   - Flutterwave: `FLWPUBK-...` (production) and `FLWSECK-...`

2. **Production Webhook URL**:
   - Must be HTTPS (required for webhooks)
   - URL: `https://your-domain.com/api/webhooks/{provider}`
   - Configure in provider dashboard

3. **Verified Business Account**:
   - Complete account verification with provider
   - Business details verified
   - Bank account connected (for payouts)

4. **SSL Certificate**:
   - Your site must be accessible via HTTPS
   - Required for webhook delivery

**Setup Steps:**
1. Complete provider account verification
2. Get production API keys from provider dashboard
3. Update keys in `/dashboard/payments`
4. Configure production webhook URL in provider dashboard
5. Test webhook delivery in provider dashboard
6. Test a real payment with a small amount
7. Verify payment appears in your provider dashboard

**Warning**: Production mode charges real money. Only enable after thorough testing!

## Manual Configuration Required

### 1. Payment Provider Dashboard Setup

**Stripe:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Get your API keys (test or live)
3. Go to Developers → Webhooks
4. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
5. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
6. Copy webhook signing secret

**Paystack:**
1. Go to [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)
2. Get your API keys (test or live)
3. Go to Settings → Webhooks
4. Add webhook URL: `https://your-domain.com/api/webhooks/paystack`
5. Copy webhook secret

**Flutterwave:**
1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com/settings/apis)
2. Get your API keys (test or live)
3. Go to Settings → Webhooks
4. Add webhook URL: `https://your-domain.com/api/webhooks/flutterwave`
5. Copy webhook secret

### 2. Environment Variables

No additional environment variables needed! All configuration is stored in the database via the payments page.

### 3. Webhook Configuration

**Critical**: Webhooks must be configured in your payment provider's dashboard for payments to be verified automatically.

**How it works:**
1. Customer completes payment on provider's page
2. Provider sends webhook to your server
3. Server verifies payment and updates booking status
4. Customer sees confirmation

**Without webhooks:**
- Payments are created but not automatically verified
- Bookings remain in "PENDING" payment status
- Manual verification required

## Troubleshooting

### Booking Flow Failing

**If payment is disabled:**
- Ensure "Require Payment at Booking" is **unchecked**
- Bookings will go directly to confirmation

**If payment is enabled:**
- Ensure payment provider is selected
- Ensure both public and secret keys are entered
- Check that keys are correct (no typos)
- Verify webhook URL is configured in provider dashboard

### Payment Not Processing

1. **Check API Keys:**
   - Verify keys are correct (copy-paste to avoid typos)
   - Ensure test keys for test mode, live keys for production
   - Check keys haven't expired or been revoked

2. **Check Webhook Configuration:**
   - Verify webhook URL is correct in provider dashboard
   - Ensure webhook secret matches what's in your config
   - Test webhook delivery in provider dashboard

3. **Check Browser Console:**
   - Open browser developer tools (F12)
   - Check Console tab for errors
   - Check Network tab for failed API calls

### Webhook Not Receiving Events

1. **HTTPS Required:**
   - Webhooks only work over HTTPS
   - Ensure your site has SSL certificate
   - Test webhook URL is accessible

2. **Webhook Secret:**
   - Must match exactly what's in provider dashboard
   - Copy-paste to avoid errors
   - Update if you regenerate webhook

3. **Provider Dashboard:**
   - Check webhook delivery logs
   - Verify webhook is active
   - Check for delivery failures

## Testing Checklist

### Before Going Live:

- [ ] Test booking flow with test keys
- [ ] Test payment with test card numbers
- [ ] Verify webhook receives test events
- [ ] Check booking status updates correctly
- [ ] Test deposit vs full payment scenarios
- [ ] Verify confirmation page shows payment status
- [ ] Test error handling (invalid cards, declined payments)
- [ ] Switch to production keys
- [ ] Test with real card (small amount)
- [ ] Verify production webhook works
- [ ] Check payment appears in provider dashboard

## Payment Flow

1. **Customer Books Service:**
   - Selects service, date, time, enters details
   - Booking is created with `paymentStatus: PENDING`

2. **Payment Step (if required):**
   - Shows payment summary
   - Customer clicks "Pay $X.XX"
   - Redirects to payment provider

3. **Payment Processing:**
   - Customer completes payment on provider's page
   - Provider sends webhook to your server
   - Server verifies and updates booking

4. **Confirmation:**
   - Customer redirected to confirmation page
   - Shows booking details and payment status

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all configuration steps are completed
3. Check provider dashboard for errors
4. Review browser console for client-side errors
5. Check server logs for API errors
