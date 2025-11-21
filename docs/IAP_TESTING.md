# In-App Purchase Testing Guide

## Overview

This guide covers how to test in-app purchases for IdeaSpark on both iOS and Android platforms.

## Prerequisites

### iOS Testing

1. **Apple Developer Account**: Required for testing IAP on iOS
2. **App Store Connect Setup**:
   - Create app in App Store Connect
   - Add In-App Purchases (subscriptions)
   - Create Sandbox Test accounts

### Android Testing

1. **Google Play Console Account**: Required for testing IAP on Android
2. **Google Play Console Setup**:
   - Create app in Play Console
   - Add subscription products
   - Configure license testing

## Product Configuration

### iOS Product IDs
```
com.ideaspark.app.pro_monthly - Pro Monthly Subscription
com.ideaspark.app.pro_yearly - Pro Yearly Subscription
```

### Android Product IDs
```
pro_monthly_subscription - Pro Monthly Subscription
pro_yearly_subscription - Pro Yearly Subscription
```

## Development Setup

### 1. Build Development Client

Since IAP requires native code, you need to build a development client:

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS Build
eas build:configure

# Build development client for iOS
eas build --profile development --platform ios

# Build development client for Android
eas build --profile development --platform android
```

### 2. Configure eas.json

Add this to your `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### 3. Environment Variables

Create `.env` file for development:

```bash
# API Configuration
API_URL=http://localhost:3001

# IAP Configuration
IAP_SANDBOX_MODE=true
IAP_DEBUG_MODE=true

# Apple Configuration (Server-side)
APPLE_SHARED_SECRET=your_shared_secret_from_app_store_connect

# Google Configuration (Server-side)
GOOGLE_SERVICE_ACCOUNT_KEY=path_to_service_account_key.json
```

## Testing on iOS

### 1. Sandbox Testing Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to Users and Access → Sandbox Testers
3. Create a new sandbox tester with a unique email
4. Note: This email cannot be associated with an existing Apple ID

### 2. Configure Device for Testing

1. On your iOS device, go to Settings → App Store
2. Sign out of your regular Apple ID
3. Scroll down to "Sandbox Account" and sign in with sandbox tester credentials

### 3. Testing Purchases

1. Launch the app with development client
2. Navigate to the upgrade screen
3. Select a subscription plan
4. Complete purchase with sandbox account
5. Password prompts will show [Environment: Sandbox]

### 4. Testing Scenarios

- **New Purchase**: Test purchasing a subscription
- **Restore Purchase**: Test restore functionality
- **Upgrade/Downgrade**: Switch between monthly and yearly
- **Cancellation**: Cancel through Settings → Apple ID → Subscriptions
- **Renewal**: Sandbox subscriptions auto-renew every few minutes

## Testing on Android

### 1. License Testing Setup

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to Setup → License testing
3. Add tester email addresses (can be your regular Gmail)
4. Set License response to "RESPOND_NORMALLY"

### 2. Internal Testing Track

1. Create an internal test release
2. Upload your APK/AAB with IAP enabled
3. Add testers to the internal testing track
4. Share the testing link with testers

### 3. Testing Purchases

1. Install app from internal testing track
2. Make sure you're logged in with a tester account
3. Navigate to upgrade screen
4. Complete purchase (test cards available)

### 4. Test Card Numbers

Google provides test card numbers for testing:
- 4111 1111 1111 1111 - Always approves
- 4000 0000 0000 0002 - Always declines

## Server-Side Testing

### 1. Receipt Validation Endpoints

Test receipt validation endpoints:

```bash
# iOS Receipt Validation
curl -X POST http://localhost:3001/api/v1/subscriptions/validate-receipt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "productId": "com.ideaspark.app.pro_monthly",
    "receipt": "BASE64_RECEIPT_DATA",
    "transactionId": "1000000123456789"
  }'

# Android Receipt Validation
curl -X POST http://localhost:3001/api/v1/subscriptions/validate-receipt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "android",
    "productId": "pro_monthly_subscription",
    "receipt": "PURCHASE_TOKEN",
    "transactionId": "GPA.1234-5678-9012-34567"
  }'
```

### 2. Webhook Testing

For testing webhooks locally, use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3001

# Configure webhook URLs in App Store Connect and Google Play Console
# Apple: https://YOUR_NGROK_URL.ngrok.io/api/v1/subscriptions/webhooks/apple
# Google: https://YOUR_NGROK_URL.ngrok.io/api/v1/subscriptions/webhooks/google
```

## Common Issues and Solutions

### iOS Issues

1. **"Cannot connect to iTunes Store"**
   - Ensure sandbox account is configured
   - Check network connection
   - Verify product IDs match App Store Connect

2. **Products not loading**
   - Agreements must be signed in App Store Connect
   - Products must be in "Ready to Submit" state
   - Bundle ID must match

### Android Issues

1. **"Item not available for purchase"**
   - App must be published to at least internal testing
   - User must be added as a tester
   - Products must be active in Play Console

2. **"Authentication is required"**
   - Ensure Google Play Store is logged in
   - Clear Play Store cache
   - Check tester email is added

## Testing Checklist

- [ ] Products load correctly on app launch
- [ ] Purchase flow completes successfully
- [ ] Receipt validation works
- [ ] Subscription status updates in app
- [ ] Restore purchases works
- [ ] Subscription management links work
- [ ] Webhooks update subscription status
- [ ] Error handling for failed purchases
- [ ] Upgrade/downgrade between plans
- [ ] Cancellation reflected in app
- [ ] Renewal processes correctly
- [ ] Free trial (if applicable)

## Production Readiness

Before going to production:

1. **iOS**:
   - Submit IAP products for review with app
   - Provide review notes and demo account
   - Test with TestFlight

2. **Android**:
   - Move to closed/open testing tracks
   - Test with larger group
   - Monitor crash reports

3. **Server**:
   - Implement proper secret management
   - Set up monitoring for webhook failures
   - Implement retry logic for validations
   - Set up alerts for subscription events

## Monitoring

Track these metrics in production:

- Conversion rate (free to paid)
- Subscription renewal rate
- Churn rate
- Failed payment recovery
- Average revenue per user (ARPU)
- Lifetime value (LTV)