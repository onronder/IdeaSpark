# APNs & FCM Configuration Guide for IdeaSpark

Your Firebase backend credentials are now configured. This guide will help you complete the iOS (APNs) and Android (FCM) setup in Firebase Console.

---

## Current Status

✅ **Firebase Service Account**: Configured in `.env`
- Project ID: `ideaspark-a8f65`
- Client Email: `firebase-adminsdk-fbsvc@ideaspark-a8f65.iam.gserviceaccount.com`

**Next Steps**:
1. Configure iOS (APNs) in Firebase Console
2. Configure Android (FCM) in Firebase Console
3. Download configuration files for mobile apps

---

## Part 1: iOS Configuration (APNs)

### Prerequisites
- **Apple Developer Account** ($99/year) - [Sign up here](https://developer.apple.com/programs/)
- **iOS app registered** with bundle ID: `com.ideaspark.app`

### Step 1: Create APNs Authentication Key

#### 1.1 Generate APNs Key in Apple Developer Portal
1. Go to [Apple Developer Portal - Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Log in with your Apple Developer account
3. Click **"+"** button (Create a key)
4. **Key Name**: `IdeaSpark Push Notifications`
5. **Enable Services**: Check **"Apple Push Notifications service (APNs)"**
6. Click **"Continue"** → **"Register"**

#### 1.2 Download and Save the Key
1. Click **"Download"** to get the `.p8` file (e.g., `AuthKey_ABC123XYZ.p8`)
2. **CRITICAL**: You can only download this **once**. Store it securely.
3. **Note the Key ID** (displayed on screen, e.g., `ABC123XYZ`)
4. **Note your Team ID** (top-right corner of Developer Portal, e.g., `DEF456UVW`)

**Save these values:**
```
Key ID: ABC123XYZ
Team ID: DEF456UVW
File: AuthKey_ABC123XYZ.p8
```

#### 1.3 Store the .p8 File Securely
**DO NOT commit to Git**. Store in:
- Password manager (1Password, LastPass)
- Encrypted storage (AWS Secrets Manager)
- Secure note in your vault

---

### Step 2: Upload APNs Key to Firebase Console

#### 2.1 Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **"ideaspark-a8f65"**
3. Click **⚙️ Settings icon** (top-left) → **"Project settings"**
4. Navigate to **"Cloud Messaging"** tab

#### 2.2 Upload APNs Authentication Key
1. Scroll down to **"Apple app configuration"** section
2. Under **"APNs Authentication Key"**, click **"Upload"**
3. **Upload the `.p8` file** (e.g., `AuthKey_ABC123XYZ.p8`)
4. Enter the required information:
   - **Key ID**: `ABC123XYZ` (from Step 1.2)
   - **Team ID**: `DEF456UVW` (from Step 1.2)
5. Click **"Upload"**

**Expected Result**:
✅ "APNs Authentication Key uploaded successfully"

---

### Step 3: Add iOS App to Firebase

#### 3.1 Register iOS App
1. In Firebase Console, on the **Project Overview** page
2. Click **"Add app"** → **iOS** (📱 icon)
3. Fill in the form:
   - **iOS bundle ID**: `com.ideaspark.app`
     - **MUST match** your Xcode project's bundle ID
   - **App nickname** (optional): `IdeaSpark iOS`
   - **App Store ID** (optional): Leave blank for now
4. Click **"Register app"**

#### 3.2 Download GoogleService-Info.plist
1. Click **"Download GoogleService-Info.plist"**
2. Save the file (you'll need to add it to your iOS project)
3. Click **"Next"** → **"Next"** → **"Continue to console"**

---

### Step 4: Add GoogleService-Info.plist to iOS Project

**For Flutter Project:**

1. **Copy the file to iOS Runner folder**:
   ```bash
   # Navigate to your Flutter project
   cd /path/to/your/flutter/project

   # Copy GoogleService-Info.plist to iOS project
   cp ~/Downloads/GoogleService-Info.plist ios/Runner/
   ```

2. **Add to Xcode** (REQUIRED - file copy alone is not enough):
   ```bash
   # Open the iOS project in Xcode
   open ios/Runner.xcworkspace
   ```

   In Xcode:
   - **Right-click** on the **"Runner"** folder (left sidebar)
   - Select **"Add Files to Runner"**
   - Navigate to `ios/Runner/GoogleService-Info.plist`
   - **IMPORTANT**: Check **"Copy items if needed"**
   - **IMPORTANT**: Ensure **"Runner"** is selected under "Add to targets"
   - Click **"Add"**

3. **Verify the file is in the correct location**:
   ```
   your-flutter-project/
   └── ios/
       └── Runner/
           ├── GoogleService-Info.plist  ✅
           ├── Info.plist
           ├── AppDelegate.swift
           └── ...
   ```

**For React Native Project:**

1. **Copy the file**:
   ```bash
   cd /path/to/your/react-native/project
   cp ~/Downloads/GoogleService-Info.plist ios/
   ```

2. **Open Xcode**:
   ```bash
   open ios/IdeaSpark.xcworkspace
   ```

3. **Add to Xcode** (same steps as Flutter above)

---

## Part 2: Android Configuration (FCM)

### Step 1: Add Android App to Firebase

#### 1.1 Register Android App
1. In Firebase Console, on the **Project Overview** page
2. Click **"Add app"** → **Android** (🤖 icon)
3. Fill in the form:
   - **Android package name**: `com.ideaspark.app`
     - **MUST match** your Android app's `applicationId` in `build.gradle`
   - **App nickname** (optional): `IdeaSpark Android`
   - **Debug signing certificate SHA-1** (optional): Leave blank
     - Only needed for Google Sign-In (not push notifications)
4. Click **"Register app"**

#### 1.2 Download google-services.json
1. Click **"Download google-services.json"**
2. Save the file (you'll need to add it to your Android project)
3. Click **"Next"** → **"Next"** → **"Continue to console"**

---

### Step 2: Add google-services.json to Android Project

**For Flutter Project:**

1. **Copy the file to Android app folder**:
   ```bash
   # Navigate to your Flutter project
   cd /path/to/your/flutter/project

   # Copy google-services.json to Android app folder
   cp ~/Downloads/google-services.json android/app/
   ```

2. **Verify the file location**:
   ```
   your-flutter-project/
   └── android/
       └── app/
           ├── google-services.json  ✅
           ├── build.gradle
           └── src/
   ```

3. **Ensure Firebase plugin is applied** (should already be in your `android/app/build.gradle`):
   ```gradle
   // At the BOTTOM of the file
   apply plugin: 'com.google.gms.google-services'
   ```

**For React Native Project:**

1. **Copy the file**:
   ```bash
   cd /path/to/your/react-native/project
   cp ~/Downloads/google-services.json android/app/
   ```

2. **Verify the file location**:
   ```
   your-react-native-project/
   └── android/
       └── app/
           ├── google-services.json  ✅
           ├── build.gradle
           └── src/
   ```

---

## Part 3: Verify Firebase Configuration

### Firebase Console Verification

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select **"ideaspark-a8f65"**
3. Go to **Project settings** → **General** tab

**You should see:**
- **iOS app**: `com.ideaspark.app` ✅
- **Android app**: `com.ideaspark.app` ✅

4. Go to **Cloud Messaging** tab

**You should see:**
- **APNs Authentication Key**: Uploaded ✅
- **Cloud Messaging API (V1)**: Enabled ✅

---

## Part 4: Test Backend Integration

### Test 1: Verify Server Startup

Restart your server to verify Firebase credentials:

```bash
cd /Users/onronder/IdeaSpark/server
npm run dev
```

**Expected Output**:
```
✓ Upstash Redis client initialized
✓ Database connected successfully
✓ Redis connection test successful
✓ Firebase service initialized       # ← This should now appear!
✓ Analytics service initialized
✓ Server running on http://localhost:3000
```

**If you see errors**:
- `Firebase app not configured` → Check `.env` file has all 3 credentials
- `private_key` parsing error → Ensure the key includes `\n` characters
- `Invalid credentials` → Regenerate service account key

---

### Test 2: Send Test Notification via Firebase Console

**Before mobile app is ready**, you can test using a dummy token:

1. Go to **Firebase Console** → **Cloud Messaging** → **"Send your first message"**
2. **Notification title**: `Test from Firebase`
3. **Notification text**: `Testing IdeaSpark push notifications`
4. Click **"Send test message"**
5. **Add an FCM registration token**: `dummy-token-for-testing`
   - This will fail (expected), but verifies Firebase is configured
6. Click **"Test"**

**Expected**: Error saying token is invalid (that's okay - this confirms Firebase is working)

---

## Part 5: Mobile App Integration

Your mobile developer will need to:

### iOS Setup (Flutter/React Native)

1. **Add Firebase packages** (already done in your project)
2. **Request notification permissions**:
   ```dart
   // Flutter
   FirebaseMessaging messaging = FirebaseMessaging.instance;
   NotificationSettings settings = await messaging.requestPermission(
     alert: true,
     badge: true,
     sound: true,
   );
   ```

3. **Get FCM token and send to backend**:
   ```dart
   String? token = await messaging.getToken();

   // POST to your server
   await http.post(
     Uri.parse('https://api.ideaspark.app/api/v1/notifications/register'),
     headers: {
       'Authorization': 'Bearer $jwtToken',
       'Content-Type': 'application/json',
     },
     body: json.encode({
       'deviceToken': token,
       'platform': 'ios',
     }),
   );
   ```

### Android Setup (Flutter/React Native)

1. **No permission required** (Android 12 and below)
   - Android 13+ requires runtime permission (handled by Firebase SDK)

2. **Get FCM token and send to backend** (same as iOS):
   ```dart
   String? token = await messaging.getToken();

   // POST to your server
   await http.post(
     Uri.parse('https://api.ideaspark.app/api/v1/notifications/register'),
     headers: {
       'Authorization': 'Bearer $jwtToken',
       'Content-Type': 'application/json',
     },
     body: json.encode({
       'deviceToken': token,
       'platform': 'android',
     }),
   );
   ```

---

## Part 6: Backend API Endpoints

Your server already has these endpoints ready:

### 1. Register Device Token
**POST** `/api/v1/notifications/register`

**Request**:
```json
{
  "deviceToken": "fcm-token-from-mobile",
  "platform": "ios" // or "android"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "deviceToken": "fcm-token-from-mobile",
  "platform": "ios",
  "isActive": true
}
```

### 2. Send Notification (Internal Use)
Your server will call this automatically when:
- AI responds to a message
- Subscription status changes
- Marketing campaigns (user consent required)

**Example** (from message controller):
```typescript
await firebaseService.sendNotification({
  deviceToken: userToken,
  title: 'New AI Response',
  body: 'Check out the latest insights for your idea!',
  data: {
    ideaId: 'uuid',
    messageId: 'uuid',
    type: 'new_message',
  },
});
```

---

## Part 7: Testing with Real Devices

### iOS Testing

1. **Build and install app** on iPhone/iPad
2. **Grant notification permission** when prompted
3. **Check logs** for FCM token:
   ```
   FCM Token: f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0
   ```
4. **Send test notification** from your server:
   ```bash
   curl -X POST http://localhost:3000/api/v1/notifications/test \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "deviceToken": "f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0",
       "title": "Test Notification",
       "body": "Hello from IdeaSpark server!"
     }'
   ```
5. **Verify notification** appears on device

### Android Testing

1. **Build and install app** on Android device
2. **FCM token** is generated automatically (no permission prompt on Android <13)
3. **Check logs** for FCM token
4. **Send test notification** (same curl command as iOS)
5. **Verify notification** appears on device

---

## Part 8: Common Issues & Troubleshooting

### iOS: Notifications Not Appearing

**Checklist**:
- [ ] `GoogleService-Info.plist` added to Xcode project (not just copied)
- [ ] APNs certificate uploaded to Firebase Console
- [ ] User granted notification permission
- [ ] App is running (test both foreground and background)
- [ ] Device is not in "Do Not Disturb" mode
- [ ] Bundle ID matches: Xcode = Firebase = `com.ideaspark.app`

**Debug**:
```dart
// In your Flutter app
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Got a message whilst in the foreground!');
  print('Message data: ${message.data}');
  if (message.notification != null) {
    print('Message also contained a notification: ${message.notification}');
  }
});
```

### Android: Notifications Not Appearing

**Checklist**:
- [ ] `google-services.json` in `android/app/` folder
- [ ] Package name matches: `build.gradle` = Firebase = `com.ideaspark.app`
- [ ] App has internet connection
- [ ] Battery optimization disabled for app (Settings → Battery)
- [ ] Notification channel created (Android 8+)

**Debug**:
```dart
// In your Flutter app (same as iOS)
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Got a message: ${message.data}');
});
```

### Backend: Firebase Initialization Failed

**Error**: `Firebase app not configured`

**Solutions**:
1. Check `.env` has all 3 credentials:
   ```bash
   FIREBASE_PROJECT_ID=ideaspark-a8f65
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ideaspark-a8f65.iam.gserviceaccount.com
   ```
2. Ensure `FIREBASE_PRIVATE_KEY` has quotes and `\n` characters
3. Restart server: `npm run dev`

### Invalid Token Error

**Error**: `messaging/invalid-registration-token`

**Causes**:
- Token expired (tokens can expire after app reinstall)
- Token from wrong Firebase project
- Token format is incorrect

**Solution**:
Your server automatically handles this by marking the token as inactive in the database.

---

## Part 9: Production Checklist

Before deploying to production:

### Firebase Console
- [ ] APNs Authentication Key uploaded
- [ ] iOS app registered with bundle ID `com.ideaspark.app`
- [ ] Android app registered with package name `com.ideaspark.app`
- [ ] Cloud Messaging API (V1) enabled

### Mobile Apps
- [ ] `GoogleService-Info.plist` added to iOS project (Xcode)
- [ ] `google-services.json` added to Android project
- [ ] FCM token registration implemented
- [ ] Notification handling implemented (foreground + background)
- [ ] Token refresh handling implemented

### Backend
- [ ] Firebase credentials in `.env` (all 3 variables)
- [ ] Server initializes Firebase without errors
- [ ] `/api/v1/notifications/register` endpoint working
- [ ] Notification sending working (test with real device)
- [ ] Error handling for invalid tokens implemented

### Testing
- [ ] iOS: Notifications work in foreground
- [ ] iOS: Notifications work in background
- [ ] iOS: Notification tap opens correct screen
- [ ] Android: Notifications work in foreground
- [ ] Android: Notifications work in background
- [ ] Android: Notification tap opens correct screen

---

## Part 10: Next Steps

After completing APNs/FCM configuration:

1. [ ] **Upload APNs key to Firebase Console** (iOS)
2. [ ] **Add iOS app** and download `GoogleService-Info.plist`
3. [ ] **Add Android app** and download `google-services.json`
4. [ ] **Verify server starts** without Firebase errors
5. [ ] **Test with real devices** (iOS + Android)
6. [ ] **Mobile developer**: Integrate FCM SDK
7. [ ] **Mobile developer**: Implement token registration
8. [ ] **End-to-end test**: Send message → AI responds → User receives push notification

---

## Support Resources

- **Firebase Console**: https://console.firebase.google.com
- **Firebase Cloud Messaging Docs**: https://firebase.google.com/docs/cloud-messaging
- **APNs Documentation**: https://developer.apple.com/documentation/usernotifications
- **Apple Developer Portal**: https://developer.apple.com/account
- **Flutter Firebase**: https://firebase.flutter.dev
- **React Native Firebase**: https://rnfirebase.io
- **IdeaSpark Issues**: https://github.com/onronder/IdeaSpark/issues

---

## Quick Reference

**Your Firebase Project**:
- Project ID: `ideaspark-a8f65`
- Console URL: https://console.firebase.google.com/project/ideaspark-a8f65

**iOS Bundle ID**: `com.ideaspark.app`
**Android Package Name**: `com.ideaspark.app`

**Required Files**:
- iOS: `GoogleService-Info.plist` (in Xcode project)
- Android: `google-services.json` (in `android/app/`)
- APNs: `.p8` key file (uploaded to Firebase Console)

**Backend Environment Variables**:
```bash
FIREBASE_PROJECT_ID=ideaspark-a8f65
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ideaspark-a8f65.iam.gserviceaccount.com
```
