# Firebase Configuration

## Setup Instructions

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project "IdeaSpark-Production"
   - Enable Cloud Messaging

2. **Download Configuration Files**
   - iOS: Download `GoogleService-Info.plist` and place in `/ios/`
   - Android: Download `google-services.json` and place in `/android/app/`

3. **Server Credentials**
   - Generate service account key from Firebase Console
   - Download JSON and store securely (never commit)
   - Set environment variables:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_PRIVATE_KEY`
     - `FIREBASE_CLIENT_EMAIL`

4. **Environment Configuration**
   ```bash
   # .env
   FIREBASE_PROJECT_ID=ideaspark-production
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@ideaspark-production.iam.gserviceaccount.com
   ```

## Security Notes
- Never commit credentials to git
- Use environment variables for all sensitive data
- Rotate service account keys regularly
- Restrict API keys in Firebase Console

## Testing
- Use Firebase Emulator Suite for local development
- Test notifications with Firebase Console test messages
- Monitor delivery rates in Firebase Console