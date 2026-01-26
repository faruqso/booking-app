# Payment Modal Security Guide

## Overview
This document outlines the security measures implemented for the inline Paystack payment modal to ensure maximum security and PCI compliance.

## Security Measures Implemented

### 1. **HTTPS Enforcement**
- **Production**: All payment requests are enforced over HTTPS
- **Headers**: Security headers configured in `next.config.js`
- **Benefit**: Prevents man-in-the-middle attacks and ensures encrypted communication

### 2. **Payment Amount Verification**
- **Server-side validation**: Payment amount is verified against booking amount
- **Prevents**: Amount tampering attacks
- **Implementation**: API compares received amount with calculated expected amount (including deposits)

### 3. **Replay Attack Prevention**
- **Timestamp validation**: Payment requests include timestamp
- **Expiration**: Requests expire after 5 minutes
- **Prevents**: Reusing old payment requests

### 4. **Input Validation**
- **Client-side**: Email format, amount range, required fields
- **Server-side**: Zod schema validation with strict rules
- **Amount limits**: Maximum payment amount enforced (1,000,000)

### 5. **Webhook Signature Verification**
- **HMAC-SHA512**: All Paystack webhooks verified using webhook secret
- **Signature header**: Validates `x-paystack-signature` header
- **Prevents**: Fake webhook attacks

### 6. **Content Security Policy (CSP)**
- **Script sources**: Only allows Paystack's official CDN (`js.paystack.co`)
- **Frame sources**: Restricted to Paystack domains
- **Connect sources**: Limited to payment provider APIs
- **Prevents**: XSS attacks and unauthorized script injection

### 7. **Error Handling**
- **Production**: Generic error messages (no sensitive data exposure)
- **Development**: Detailed errors for debugging
- **Logging**: All errors logged server-side with timestamps

### 8. **Payment Reference Verification**
- **Client-side**: Verifies Paystack response reference matches expected reference
- **Prevents**: Payment manipulation or fake success responses

### 9. **Security Headers**
- **Strict-Transport-Security**: Forces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Browser XSS protection
- **Referrer-Policy**: Controls referrer information

### 10. **PCI Compliance**
- **No card data handling**: Paystack SDK handles all card data
- **No storage**: Card details never touch our servers
- **Iframe isolation**: Payment form runs in Paystack's secure iframe

## Best Practices for Maximum Security

### ✅ DO:
1. **Always use HTTPS** in production
2. **Verify webhook signatures** before processing
3. **Validate amounts server-side** before creating payments
4. **Use timestamp/nonce** for payment requests
5. **Log all payment events** for audit trail
6. **Monitor for suspicious activity** (multiple failed payments, unusual amounts)
7. **Keep webhook secrets secure** (never commit to git)
8. **Use environment variables** for all API keys
9. **Implement rate limiting** (consider adding to payment endpoints)
10. **Regular security audits** of payment flows

### ❌ DON'T:
1. **Don't trust client-side validation alone** - always verify server-side
2. **Don't expose API keys** in client-side code (only public keys)
3. **Don't log sensitive data** (card numbers, CVV, full API keys)
4. **Don't skip webhook verification** - always verify signatures
5. **Don't process payments without HTTPS** in production
6. **Don't expose detailed errors** to end users in production
7. **Don't store payment credentials** in plain text
8. **Don't allow payment amount modification** after booking creation

## Additional Security Recommendations

### Rate Limiting (To Implement)
Consider adding rate limiting to `/api/payments/create`:
- Limit: 5 requests per IP per 15 minutes
- Prevents: Payment spam and brute force attacks

### Monitoring & Alerts
- Monitor failed payment attempts
- Alert on unusual payment patterns
- Track payment success rates
- Monitor webhook delivery failures

### Regular Updates
- Keep Paystack SDK updated
- Review security headers periodically
- Update dependencies regularly
- Follow Paystack security advisories

## Testing Security

### Test Cases:
1. ✅ HTTPS enforcement in production
2. ✅ Amount tampering prevention
3. ✅ Replay attack prevention (old timestamps rejected)
4. ✅ Invalid email format rejection
5. ✅ Webhook signature verification
6. ✅ CSP header enforcement
7. ✅ Error message sanitization

## Compliance

- **PCI DSS**: Compliant (no card data handling)
- **GDPR**: Payment data handled per privacy policy
- **SOC 2**: Depends on Paystack's compliance (they are SOC 2 compliant)

## Incident Response

If a security issue is detected:
1. Immediately disable affected payment endpoints
2. Review logs for suspicious activity
3. Notify affected users if data compromised
4. Rotate API keys and webhook secrets
5. Document incident and remediation steps
