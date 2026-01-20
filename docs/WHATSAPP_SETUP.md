# WhatsApp Business Notifications Setup Guide

This guide will help you set up WhatsApp notifications for your business using Meta's WhatsApp Cloud API. You'll receive real-time notifications when customers create, cancel, or modify bookings.

## Overview

WhatsApp notifications allow you to:
- Receive instant alerts when new bookings are created
- Get notified when bookings are cancelled
- Be informed when bookings are modified or rescheduled

## Prerequisites

1. A Meta Business Account
2. A WhatsApp Business Account
3. A phone number for WhatsApp Business (can be your existing business number)
4. Access to Meta Business Manager

## Step-by-Step Setup

### Step 1: Create Meta Business Account

1. Go to [Meta Business Manager](https://business.facebook.com)
2. Click "Create Account" if you don't have one
3. Follow the setup wizard to create your business account
4. Verify your business (this may take a few days)

### Step 2: Set Up WhatsApp Business Account

1. In Meta Business Manager, go to **Business Settings**
2. Navigate to **Accounts** > **WhatsApp Accounts**
3. Click **Add** to create a new WhatsApp Business Account
4. Follow the prompts to set up your account
5. Add a phone number (this will be your WhatsApp Business number)

### Step 3: Get Your Access Token

1. In Meta Business Manager, go to **WhatsApp** > **API Setup**
2. You'll see your **Phone Number ID** (save this for later)
3. To get your **Access Token**:
   - Go to **System Users** in Business Settings
   - Create a new system user or use an existing one
   - Assign the system user to your WhatsApp Business Account
   - Generate a token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions
   - Copy the token (you won't be able to see it again!)

### Step 4: Create Message Templates

WhatsApp requires pre-approved message templates for proactive notifications. You need to create three templates:

#### Template 1: New Booking Notification

1. Go to **WhatsApp** > **Message Templates** in Meta Business Manager
2. Click **Create Template**
3. Fill in the details:
   - **Name**: `new_booking_notification`
   - **Category**: `UTILITY`
   - **Language**: `English (US)`
4. Add components:
   - **Header** (Text): `New Booking Received`
   - **Body** (Text): 
     ```
     You have a new booking!

     Customer: {{1}}
     Service: {{2}}
     Date: {{3}}
     Time: {{4}}

     Booking ID: {{5}}
     ```
   - **Footer** (Text): `Check your dashboard for details`
5. Submit for approval (typically takes 24-48 hours)

#### Template 2: Booking Cancelled Notification

1. Create a new template
2. Fill in:
   - **Name**: `booking_cancelled_notification`
   - **Category**: `UTILITY`
   - **Language**: `English (US)`
3. Add components:
   - **Header** (Text): `Booking Cancelled`
   - **Body** (Text):
     ```
     A booking has been cancelled.

     Customer: {{1}}
     Service: {{2}}
     Original Date: {{3}}
     Original Time: {{4}}

     Booking ID: {{5}}
     ```
   - **Footer** (Text): `Check your dashboard for details`
4. Submit for approval

#### Template 3: Booking Modified Notification

1. Create a new template
2. Fill in:
   - **Name**: `booking_modified_notification`
   - **Category**: `UTILITY`
   - **Language**: `English (US)`
3. Add components:
   - **Header** (Text): `Booking Modified`
   - **Body** (Text):
     ```
     A booking has been modified.

     Customer: {{1}}
     Service: {{2}}
     New Date: {{3}}
     New Time: {{4}}

     Booking ID: {{5}}
     ```
   - **Footer** (Text): `Check your dashboard for details`
4. Submit for approval

### Step 5: Configure in Your Booking App

1. Log in to your booking app dashboard
2. Go to **Settings** > **WhatsApp Notifications**
3. Enter your configuration:
   - **WhatsApp Phone Number**: Your business WhatsApp number (E.164 format, e.g., +1234567890)
   - **Access Token**: The token you generated in Step 3
   - **Phone Number ID**: The ID from Step 3
   - **Business Account ID** (Optional): Your WhatsApp Business Account ID
4. Toggle **Enable WhatsApp Notifications** to ON
5. Click **Save WhatsApp Settings**

## Testing

Once your templates are approved:

1. Create a test booking through your booking page
2. You should receive a WhatsApp message on your configured number
3. If you don't receive a message, check:
   - Template approval status in Meta Business Manager
   - Access token validity
   - Phone number format (must include country code with +)
   - Error logs in your application

## Cost Information

- **Free Tier**: First 1,000 conversations per month are typically free
- **Paid Tier**: After the free tier, you pay per conversation
- **Template Messages**: Free to send (counts toward conversation limit)
- **Customer-Initiated**: Free for 24 hours after customer messages you

## Troubleshooting

### Templates Not Approved

- Ensure templates follow WhatsApp's content policy
- Avoid promotional language in UTILITY category templates
- Wait 24-48 hours for approval
- Check template status in Meta Business Manager

### Not Receiving Messages

1. **Check Template Status**: Templates must be approved before use
2. **Verify Credentials**: Double-check access token and phone number ID
3. **Phone Number Format**: Must be in E.164 format (+country code + number)
4. **Check Logs**: Review application logs for error messages
5. **Test Access Token**: Verify token hasn't expired (tokens can expire)

### Access Token Expired

- Access tokens can expire
- Regenerate token in Meta Business Manager
- Update token in your booking app settings

### Rate Limiting

- WhatsApp has rate limits on message sending
- If you exceed limits, messages will be queued
- Consider implementing retry logic for failed messages

## Security Best Practices

1. **Never Share Your Access Token**: Treat it like a password
2. **Use Environment Variables**: Store tokens securely (not in code)
3. **Rotate Tokens Regularly**: Regenerate tokens periodically
4. **Limit Token Permissions**: Only grant necessary permissions
5. **Monitor Usage**: Regularly check for unauthorized access

## Advanced Configuration

### Webhook Setup (Optional)

For receiving inbound messages from customers:

1. In Meta Business Manager, go to **WhatsApp** > **Configuration**
2. Set up webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
3. Set verify token (use a secure random string)
4. Subscribe to message events

### Multiple Phone Numbers

If you have multiple locations or departments:

- Each phone number needs its own WhatsApp Business Account
- Configure each separately in your booking app
- Use location-specific phone numbers for notifications

## Support Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [WhatsApp Business API Pricing](https://developers.facebook.com/docs/whatsapp/pricing)

## Template Parameter Reference

The following parameters are automatically filled when sending notifications:

- `{{1}}`: Customer name
- `{{2}}`: Service name
- `{{3}}`: Date (formatted)
- `{{4}}`: Time (formatted)
- `{{5}}`: Booking ID (short format)

## Next Steps

After setup:

1. Test with a real booking
2. Monitor notification delivery
3. Adjust template messages if needed (requires re-approval)
4. Set up webhooks for two-way communication (optional)
5. Consider adding more notification types (reminders, confirmations, etc.)

---

**Note**: This setup requires technical knowledge of Meta Business Manager. If you need assistance, consider consulting with a developer or Meta's support team.
