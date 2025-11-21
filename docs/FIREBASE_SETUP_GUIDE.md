# Firebase Setup Guide for IdeaSpark Push Notifications

This guide provides detailed instructions for setting up Firebase Cloud Messaging (FCM) for push notifications in IdeaSpark, including iOS (APNs) and Android configuration.

---

## Overview

IdeaSpark uses Firebase Cloud Messaging to send:
- **New message notifications**: When AI responds to user's idea
- **Subscription updates**: Payment confirmations
- **Marketing notifications**: Feature announcements (optional, user consent required)

**Technologies**:
- **Backend**: Firebase Admin SDK (Node.js)
- **iOS**: Firebase Cloud Messaging + APNs
- **Android**: Firebase Cloud Messaging (native)

---

## Part 1: Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** (or **"Create a project"**)
3. **Project name**: `IdeaSpark` (or `IdeaSpark-Production`)
4. **Google Analytics**:
   - **Enable** (recommended for tracking notification engagement)
   - **Analytics account**: Use existing or create new
5. Click **"Create project"** (takes 30-60 seconds)

### Step 2: Enable Cloud Messaging

1. In your Firebase project, go to **Project settings** (gear icon, top-left)
2. Navigate to **"Cloud Messaging"** tab
3. **Cloud Messaging API (V1)** should be enabled by default
   - If not, click **"Enable"**
4. Note: You'll see "Cloud Messaging API (Legacy)" - **DO NOT use this** (deprecated June 2024)

---

## Part 2: Generate Service Account Credentials

### Step 1: Create Service Account

1. In Firebase Console, go to **Project settings** → **Service accounts**
2. Click **"Generate new private key"**
3. **Confirmation dialog**: Click **"Generate key"**
4. A JSON file will download: `ideaspark-firebase-adminsdk-xxxxx.json`

### Step 2: Extract Credentials

Open the downloaded JSON file and extract these values:

```json
{
  "type": "service_account",
  "project_id": "ideaspark-12345",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BA...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@ideaspark-12345.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**You need these 3 values**:
- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY`
- `client_email` → `FIREBASE_CLIENT_EMAIL`

### Step 3: Add to `.env` File

Open `/Users/onronder/IdeaSpark/server/.env` and add:

```bash
# Firebase Cloud Messaging (for push notifications)
FIREBASE_PROJECT_ID=ideaspark-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ideaspark-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BA...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT**:
- Keep the `private_key` in **double quotes** (it contains newlines)
- The `\n` characters must remain in the string (they represent line breaks)
- **DO NOT** commit this file to Git (already in `.gitignore`)

### Step 4: Secure the JSON File

1. **Store the original JSON file securely**:
   - Use a password manager (1Password, LastPass, Bitwarden)
   - Or encrypted storage (AWS Secrets Manager, HashiCorp Vault)
2. **Delete the file from your Downloads folder** (security risk)
3. **Never commit** `*-firebase-adminsdk-*.json` to Git

---

## Part 3: iOS Configuration (APNs)

Firebase Cloud Messaging on iOS requires APNs (Apple Push Notification service) configuration.

### Prerequisites
- **Apple Developer Account** ($99/year)
- **Xcode** installed
- **iOS app bundle ID** (e.g., `com.ideaspark.app`)

### Step 1: Create APNs Authentication Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **"+"** to create a new key
3. **Key Name**: `IdeaSpark Push Notifications`
4. **Enable**: Check **"Apple Push Notifications service (APNs)"**
5. Click **"Continue"** → **"Register"**
6. **Download the `.p8` key file** (e.g., `AuthKey_ABC123XYZ.p8`)
7. **Note the Key ID** (e.g., `ABC123XYZ`)
8. **Note your Team ID** (found in top-right corner of Developer Portal)

**IMPORTANT**: You can only download this key **once**. Store it securely.

### Step 2: Upload APNs Key to Firebase

1. Go to **Firebase Console** → **Project settings** → **Cloud Messaging** tab
2. Scroll to **"Apple app configuration"** section
3. Click **"Upload"** under **APNs Authentication Key**
4. **Upload the `.p8` file**
5. Enter:
   - **Key ID**: `ABC123XYZ` (from Step 1)
   - **Team ID**: `DEF456UVW` (from Apple Developer Portal)
6. Click **"Upload"**

### Step 3: Add iOS App to Firebase

1. In Firebase Console, click **"Add app"** → **iOS**
2. **iOS bundle ID**: `com.ideaspark.app` (must match your Xcode project)
3. **App nickname**: `IdeaSpark iOS` (optional)
4. **App Store ID**: Leave blank (only needed for Dynamic Links)
5. Click **"Register app"**
6. **Download `GoogleService-Info.plist`**
7. Click **"Next"** through the setup steps (SDK installation handled separately)

### Step 4: Add `GoogleService-Info.plist` to iOS App

**This is for your mobile developer** (Flutter/React Native):

1. **Flutter**:
   ```bash
   # Place the file in your iOS project:
   cp GoogleService-Info.plist /path/to/ideaspark-app/ios/Runner/

   # Add to Xcode:
   # - Open ios/Runner.xcworkspace
   # - Drag GoogleService-Info.plist into Runner folder in Xcode
   # - Ensure "Copy items if needed" is checked
   ```

2. **React Native**:
   ```bash
   # Place the file in your iOS project:
   cp GoogleService-Info.plist /path/to/ideaspark-app/ios/

   # It will be automatically picked up by React Native Firebase
   ```

---

## Part 4: Android Configuration (FCM)

### Step 1: Add Android App to Firebase

1. In Firebase Console, click **"Add app"** → **Android**
2. **Android package name**: `com.ideaspark.app` (must match your app's package name)
3. **App nickname**: `IdeaSpark Android` (optional)
4. **Debug signing certificate SHA-1**: Leave blank for now (only needed for Google Sign-In)
5. Click **"Register app"**
6. **Download `google-services.json`**
7. Click **"Next"** through the setup steps

### Step 2: Add `google-services.json` to Android App

**This is for your mobile developer**:

1. **Flutter**:
   ```bash
   # Place the file in your Android project:
   cp google-services.json /path/to/ideaspark-app/android/app/
   ```

2. **React Native**:
   ```bash
   # Place the file in your Android project:
   cp google-services.json /path/to/ideaspark-app/android/app/
   ```

**Verify placement**:
- Flutter: `android/app/google-services.json` ✓
- React Native: `android/app/google-services.json` ✓

---

## Part 5: Testing Firebase Integration

### Test 1: Server Initialization

After adding credentials to `.env`, restart your server:

```bash
cd /Users/onronder/IdeaSpark/server
npm run dev
```

**Expected Output**:
```
✓ Firebase service initialized
✓ Server running on http://localhost:3000
```

**If you see errors**:
- `FIREBASE_PROJECT_ID` not found → Check `.env` file
- `private_key` parsing error → Ensure `\n` characters are preserved
- `client_email` invalid → Verify email matches JSON file

### Test 2: Send Test Notification (via Server)

Once you have a device token from the mobile app:

```bash
curl -X POST http://localhost:3000/api/v1/notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "fcm-token-from-mobile-app",
    "title": "Test Notification",
    "body": "This is a test from IdeaSpark server"
  }'
```

**Expected Response** (HTTP 200):
```json
{
  "success": true,
  "messageId": "projects/ideaspark-12345/messages/0:1234567890"
}
```

### Test 3: Send Test Notification (via Firebase Console)

1. Go to **Firebase Console** → **Cloud Messaging**
2. Click **"Send your first message"**
3. **Notification title**: `Test Notification`
4. **Notification text**: `Testing Firebase integration`
5. Click **"Send test message"**
6. Enter your **FCM device token** (from mobile app logs)
7. Click **"Test"**

**Expected**: Notification appears on your device

---

## Part 6: Mobile App Integration

### Required SDKs

**Flutter** (`pubspec.yaml`):
```yaml
dependencies:
  firebase_core: ^3.0.0
  firebase_messaging: ^15.0.0
```

**React Native** (`package.json`):
```json
{
  "dependencies": {
    "@react-native-firebase/app": "^20.0.0",
    "@react-native-firebase/messaging": "^20.0.0"
  }
}
```

### Flutter Implementation Example

```dart
// lib/services/notification_service.dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> initialize() async {
    // Request permission (iOS)
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission');

      // Get FCM token
      String? token = await _messaging.getToken();
      print('FCM Token: $token');

      // Send token to your server
      await _sendTokenToServer(token);
    }
  }

  Future<void> _sendTokenToServer(String? token) async {
    // POST to /api/v1/notifications/register
    await http.post(
      Uri.parse('https://api.ideaspark.app/api/v1/notifications/register'),
      headers: {'Authorization': 'Bearer $jwtToken'},
      body: json.encode({
        'deviceToken': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      }),
    );
  }
}
```

### React Native Implementation Example

```javascript
// src/services/NotificationService.js
import messaging from '@react-native-firebase/messaging';

export class NotificationService {
  async initialize() {
    // Request permission (iOS)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted');

      // Get FCM token
      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // Send token to server
      await this._sendTokenToServer(token);
    }
  }

  async _sendTokenToServer(token) {
    // POST to /api/v1/notifications/register
    await fetch('https://api.ideaspark.app/api/v1/notifications/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceToken: token,
        platform: Platform.OS,
      }),
    });
  }
}
```

---

## Part 7: Server-Side Notification Sending

Your server already has the infrastructure. Here's how it works:

### Current Implementation

**File**: `/Users/onronder/IdeaSpark/server/src/services/firebase.service.ts`

```typescript
async sendNotification(params: {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<string> {
  const message: admin.messaging.Message = {
    notification: {
      title: params.title,
      body: params.body,
    },
    data: params.data,
    token: params.deviceToken,
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'ideaspark-messages',
      },
    },
  };

  const messageId = await admin.messaging().send(message);
  return messageId;
}
```

### Example: Notify User on New AI Message

```typescript
// In your message controller (src/controllers/message.controller.ts)
import { firebaseService } from '../services/firebase.service';

export async function sendMessage(req: Request, res: Response) {
  // ... create message logic ...

  // Send push notification
  const deviceToken = await getDeviceToken(req.user.id);
  if (deviceToken) {
    await firebaseService.sendNotification({
      deviceToken,
      title: 'New AI Response',
      body: message.content.substring(0, 100) + '...',
      data: {
        ideaId: ideaId,
        messageId: message.id,
        type: 'new_message',
      },
    });
  }

  res.status(201).json(message);
}
```

---

## Part 8: Production Best Practices

### 1. Handle Token Refresh

Device tokens can change. Handle `onTokenRefresh` in mobile app:

**Flutter**:
```dart
FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
  _sendTokenToServer(newToken);
});
```

**React Native**:
```javascript
messaging().onTokenRefresh(token => {
  _sendTokenToServer(token);
});
```

### 2. Store Tokens Securely

Your server stores tokens in `notification_tokens` table:

```sql
SELECT * FROM notification_tokens WHERE user_id = 'user-id-here';
```

**Schema** (already exists):
- `user_id`: Owner of the token
- `device_token`: FCM token
- `platform`: 'ios' or 'android'
- `is_active`: Soft delete for invalid tokens
- `last_used_at`: Track engagement

### 3. Handle Notification Permissions

**iOS**: Users must grant permission
**Android**: Notifications enabled by default (Android 12 and below)

Implement graceful degradation if permission denied:
- Show in-app messages instead
- Offer email notifications as fallback

### 4. Notification Channels (Android)

Create channels for different notification types:

```typescript
// In mobile app
if (Platform.OS === 'android') {
  await notifee.createChannel({
    id: 'ideaspark-messages',
    name: 'Idea Messages',
    importance: AndroidImportance.HIGH,
  });

  await notifee.createChannel({
    id: 'ideaspark-marketing',
    name: 'Updates',
    importance: AndroidImportance.DEFAULT,
  });
}
```

### 5. Error Handling

Your server should handle:
- **Invalid token**: `messaging/invalid-registration-token`
  - Solution: Mark token as inactive in database
- **Token expired**: `messaging/registration-token-not-registered`
  - Solution: Delete token from database
- **Rate limits**: `messaging/too-many-requests`
  - Solution: Implement exponential backoff

**Example error handler** (add to `firebase.service.ts`):

```typescript
try {
  await admin.messaging().send(message);
} catch (error: any) {
  if (error.code === 'messaging/invalid-registration-token') {
    // Mark token as inactive
    await prisma.notificationToken.update({
      where: { device_token: deviceToken },
      data: { is_active: false },
    });
  } else if (error.code === 'messaging/registration-token-not-registered') {
    // Delete token
    await prisma.notificationToken.delete({
      where: { device_token: deviceToken },
    });
  }
  throw error;
}
```

---

## Part 9: Testing Checklist

### Backend Testing
- [ ] Firebase service initializes without errors
- [ ] Server can send test notification via `/notifications/test` endpoint
- [ ] Invalid tokens are handled gracefully
- [ ] Notification logs are created in `notifications` table

### iOS Testing
- [ ] `GoogleService-Info.plist` added to Xcode project
- [ ] APNs certificate uploaded to Firebase
- [ ] Device receives notification (foreground)
- [ ] Device receives notification (background)
- [ ] Notification tap opens correct screen
- [ ] Badge count updates

### Android Testing
- [ ] `google-services.json` added to `android/app/`
- [ ] Device receives notification (foreground)
- [ ] Device receives notification (background)
- [ ] Notification tap opens correct screen
- [ ] Notification channel works

---

## Part 10: Monitoring & Analytics

### Firebase Console Analytics

1. Go to **Firebase Console** → **Cloud Messaging** → **Reports**
2. Monitor:
   - **Delivery rate**: Should be > 95%
   - **Open rate**: Industry avg ~5-10%
   - **Impression rate**: Notifications shown to users

### Server-Side Logging

Your server logs notifications in the `notifications` table:

```sql
-- Check notification delivery status
SELECT
  type,
  COUNT(*) as total,
  AVG(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) * 100 as delivery_rate
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type;
```

### Cost

Firebase Cloud Messaging is **FREE** for unlimited notifications.

**Paid features** (optional):
- **A/B testing**: $25/month (part of Firebase Growth plan)
- **Advanced analytics**: $150/month (part of Firebase Scale plan)

---

## Part 11: Troubleshooting

### Error: "App not configured"
**Symptoms**: Server logs `Firebase app not configured`

**Solution**:
1. Verify all 3 environment variables are set in `.env`
2. Check `private_key` has `\n` characters (line breaks)
3. Restart server

### Error: "Invalid APNs certificate"
**Symptoms**: iOS notifications fail, Android works

**Solution**:
1. Verify APNs key is uploaded to Firebase Console
2. Check Key ID and Team ID match
3. Ensure bundle ID matches (`com.ideaspark.app`)

### Error: "MismatchSenderId"
**Symptoms**: Android notifications fail

**Solution**:
1. Verify `google-services.json` matches Firebase project
2. Ensure package name in `AndroidManifest.xml` matches Firebase
3. Rebuild Android app

### Notifications Not Appearing on iOS

**Checklist**:
- [ ] User granted notification permission
- [ ] APNs certificate uploaded and valid
- [ ] Device is not in Do Not Disturb mode
- [ ] Notification payload includes `apns` configuration
- [ ] App is running (test both foreground and background)

### Notifications Not Appearing on Android

**Checklist**:
- [ ] Notification channel created (Android 8+)
- [ ] `google-services.json` in `android/app/`
- [ ] Battery optimization disabled for app
- [ ] Device has internet connection

---

## Part 12: Next Steps

After completing Firebase setup:

1. [ ] Add Firebase credentials to `.env` file
2. [ ] Restart server and verify initialization
3. [ ] Add `GoogleService-Info.plist` to iOS app (mobile developer)
4. [ ] Add `google-services.json` to Android app (mobile developer)
5. [ ] Implement FCM token registration in mobile app
6. [ ] Test notification sending from server
7. [ ] Test notification receiving on both platforms
8. [ ] Monitor delivery rates in Firebase Console

---

## Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs/cloud-messaging
- **Firebase Admin SDK (Node.js)**: https://firebase.google.com/docs/admin/setup
- **APNs Documentation**: https://developer.apple.com/documentation/usernotifications
- **Firebase Console**: https://console.firebase.google.com
- **Firebase Status**: https://status.firebase.google.com
- **IdeaSpark Issues**: https://github.com/onronder/IdeaSpark/issues
