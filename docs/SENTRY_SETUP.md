# Sentry Setup Guide

## Current Status
✅ Sentry configuration files are ready
✅ `.env` file created with placeholder
⏳ Waiting for Sentry DSN from wizard

## Steps to Complete Sentry Setup

### 1. Run the Sentry Wizard (in your terminal, not through Claude)

```bash
npx @sentry/wizard@latest -i reactNative --saas --org fittechs --project react-native
```

The wizard will:
- Prompt you to log in to Sentry
- Create or select a project under your `fittechs` organization
- Generate a DSN (Data Source Name)
- Update your configuration files

### 2. Update Your .env File

After the wizard completes, it will give you a DSN that looks like:
```
https://abc123@o123456.ingest.sentry.io/7654321
```

Add this to your `.env` file:
```bash
EXPO_PUBLIC_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
```

### 3. Optional: Get an Auth Token (for Source Maps)

To upload source maps for better error debugging:

1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create a new auth token with `project:write` scope
3. Add to `.env`:
```bash
SENTRY_AUTH_TOKEN=your-auth-token-here
```

### 4. Restart Your App

After updating `.env`:
```bash
# Stop the current dev server (Ctrl+C)
# Clear cache and restart
npx expo start -c
```

## What's Already Configured

### ✅ Sentry Configuration (`sentry.config.ts`)
- Error tracking with context filtering
- Performance monitoring (20% sample rate in production)
- Session tracking
- React Navigation integration
- Automatic PII filtering
- Development vs Production environment detection

### ✅ Error Boundary Integration
Your app already uses `SentryErrorBoundary` in `app/_layout.tsx`:
```typescript
<SentryErrorBoundary fallback={ErrorFallback} showDialog={__DEV__}>
  {/* Your app */}
</SentryErrorBoundary>
```

### ✅ Logging Integration
All your existing loggers (`useLogger`, `useErrorHandler`) automatically send data to Sentry once the DSN is configured.

## Features Enabled

### Error Tracking
- ✅ Automatic crash reporting
- ✅ Unhandled promise rejections
- ✅ React component errors
- ✅ Network errors (filtered)

### Performance Monitoring
- ✅ App startup time
- ✅ Screen navigation tracking
- ✅ API request timing
- ✅ Component render performance

### User Context
- ✅ User ID tracking (anonymous by default)
- ✅ Device information
- ✅ App version
- ✅ Environment (dev/prod)

### Privacy & Security
- ✅ Email addresses removed from reports
- ✅ Passwords filtered from breadcrumbs
- ✅ API keys/tokens removed
- ✅ Network errors filtered in development

## Testing Sentry

After setup, test that Sentry is working:

```typescript
// Trigger a test error
import { captureException } from '@/sentry.config';

captureException(new Error('Test error from IdeaSpark'));
```

Check your Sentry dashboard at:
https://fittechs.sentry.io/issues/

## Troubleshooting

### "Sentry DSN not configured" message
- ✅ This is expected until you add the DSN to `.env`
- The app works fine without Sentry (falls back to console logging)

### Errors not appearing in Sentry
1. Check `.env` has the correct DSN
2. Restart the Metro bundler
3. Check network connectivity
4. Verify the DSN is for the correct project

### Source maps not uploading
1. Ensure `SENTRY_AUTH_TOKEN` is in `.env`
2. Check token has `project:write` permissions
3. Rebuild the app after adding the token

## Environment Variables Reference

```bash
# Required
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...

# Optional but recommended
SENTRY_ENVIRONMENT=development  # or 'staging', 'production'
SENTRY_AUTH_TOKEN=...          # For source map uploads
EXPO_PUBLIC_SENTRY_DEBUG=true  # Send errors in dev mode
EXPO_PUBLIC_APP_VERSION=1.0.0  # Tag errors with version
```

## Next Steps

1. ✅ Run the wizard in your terminal
2. ✅ Copy the DSN to `.env`
3. ✅ Restart your app
4. ✅ Test with a sample error
5. ✅ Check Sentry dashboard for the error

---

**Note**: The configuration is production-ready. Once you add the DSN, Sentry will automatically start tracking errors and performance in your app!
