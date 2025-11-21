# iOS Firebase Integration Guide for IdeaSpark

This guide is for your iOS/Flutter mobile developer to integrate Firebase Cloud Messaging for push notifications.

---

## Overview

**Firebase Project**: `ideaspark-a8f65`
**iOS Bundle ID**: `com.ideaspark.app`
**Required File**: `GoogleService-Info.plist` (you have this)

---

## Platform-Specific Instructions

Choose the section based on your mobile framework:
- [Flutter/Dart](#flutter-integration) ← **Recommended if using Flutter**
- [Native iOS (Swift/SwiftUI)](#native-ios-integration)
- [React Native](#react-native-integration)

---

## Flutter Integration

### Step 1: Add Dependencies

Add Firebase packages to `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter

  # Firebase Core (required)
  firebase_core: ^3.6.0

  # Firebase Cloud Messaging (for push notifications)
  firebase_messaging: ^15.1.3

  # Optional: Local notifications (to show notifications in foreground)
  flutter_local_notifications: ^18.0.1
```

Run:
```bash
flutter pub get
```

### Step 2: Add GoogleService-Info.plist to iOS Project

1. **Copy the file**:
   ```bash
   # Place GoogleService-Info.plist in your Flutter project
   cp ~/Downloads/GoogleService-Info.plist ios/Runner/
   ```

2. **Add to Xcode** (CRITICAL - file copy alone is not enough):
   ```bash
   # Open iOS project in Xcode
   cd ios
   open Runner.xcworkspace
   ```

3. **In Xcode**:
   - Right-click on **"Runner"** folder in the left sidebar
   - Select **"Add Files to Runner"**
   - Navigate to `ios/Runner/GoogleService-Info.plist`
   - ✅ Check **"Copy items if needed"**
   - ✅ Ensure **"Runner"** is selected under "Add to targets"
   - Click **"Add"**

4. **Verify**:
   - File should appear in Xcode under **Runner** folder
   - File path: `ios/Runner/GoogleService-Info.plist` ✓

### Step 3: Configure iOS Capabilities

1. **In Xcode**, with `Runner.xcworkspace` open:
   - Select **Runner** (top-left, blue icon)
   - Select **"Signing & Capabilities"** tab
   - Click **"+ Capability"**
   - Add:
     - **Push Notifications** ✓
     - **Background Modes** ✓
       - Check: **Remote notifications**
       - Check: **Background fetch** (optional)

### Step 4: Update AppDelegate.swift

Replace `ios/Runner/AppDelegate.swift` with:

```swift
import UIKit
import Flutter
import FirebaseCore
import FirebaseMessaging

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Initialize Firebase
    FirebaseApp.configure()

    // Initialize Flutter plugins
    GeneratedPluginRegistrant.register(with: self)

    // Request notification permission (iOS 10+)
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
      let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
      UNUserNotificationCenter.current().requestAuthorization(
        options: authOptions,
        completionHandler: { _, _ in }
      )
    } else {
      let settings: UIUserNotificationSettings =
        UIUserNotificationSettings(types: [.alert, .badge, .sound], categories: nil)
      application.registerUserNotificationSettings(settings)
    }

    application.registerForRemoteNotifications()

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Handle FCM token refresh
  override func application(_ application: UIApplication,
                            didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
  }
}
```

### Step 5: Initialize Firebase in Flutter App

Update your `lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

// Top-level background message handler
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling background message: ${message.messageId}');
}

void main() async {
  // Ensure Flutter is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp();

  // Set background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IdeaSpark',
      home: const HomePage(),
    );
  }
}
```

### Step 6: Implement Push Notification Service

Create `lib/services/notification_service.dart`:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  String? _fcmToken;

  Future<void> initialize() async {
    // Request permission (iOS)
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted notification permission');

      // Get FCM token
      _fcmToken = await _messaging.getToken();
      print('FCM Token: $_fcmToken');

      // Send token to your backend
      if (_fcmToken != null) {
        await _sendTokenToServer(_fcmToken!);
      }

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        _sendTokenToServer(newToken);
      });

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print('Received foreground message: ${message.notification?.title}');

        // Show notification using flutter_local_notifications
        // (Implementation below)
      });

      // Handle notification taps
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        print('Notification tapped: ${message.data}');
        // Navigate to specific screen based on message.data
        _handleNotificationTap(message);
      });

      // Check if app was opened from a notification
      RemoteMessage? initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationTap(initialMessage);
      }
    } else if (settings.authorizationStatus == AuthorizationStatus.denied) {
      print('User denied notification permission');
    }
  }

  Future<void> _sendTokenToServer(String token) async {
    try {
      // Get JWT token from your auth system
      final jwtToken = await _getAuthToken();

      final response = await http.post(
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

      if (response.statusCode == 201) {
        print('FCM token registered successfully');
      } else {
        print('Failed to register FCM token: ${response.statusCode}');
      }
    } catch (e) {
      print('Error sending token to server: $e');
    }
  }

  void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;

    if (data.containsKey('ideaId')) {
      // Navigate to idea detail screen
      final ideaId = data['ideaId'];
      // navigatorKey.currentState?.pushNamed('/idea-detail', arguments: ideaId);
    } else if (data.containsKey('type') && data['type'] == 'new_message') {
      // Navigate to messages screen
      // navigatorKey.currentState?.pushNamed('/messages');
    }
  }

  Future<String> _getAuthToken() async {
    // Get your JWT token from secure storage
    // This is just a placeholder
    return 'your-jwt-token';
  }

  String? get fcmToken => _fcmToken;
}
```

### Step 7: Use the Notification Service

In your app initialization:

```dart
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final NotificationService _notificationService = NotificationService();

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
  }

  Future<void> _initializeNotifications() async {
    await _notificationService.initialize();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('IdeaSpark')),
      body: Center(
        child: Text('FCM Token: ${_notificationService.fcmToken ?? "Loading..."}'),
      ),
    );
  }
}
```

### Step 8: Test on Real iOS Device

**IMPORTANT**: Push notifications don't work in iOS Simulator. You **must** use a real iPhone/iPad.

1. **Connect iPhone** to Mac
2. **Build and run**:
   ```bash
   flutter run
   ```
3. **Grant notification permission** when prompted
4. **Check console** for FCM token:
   ```
   FCM Token: f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6...
   ```
5. **Test notification** from your backend

---

## Native iOS Integration (Swift/SwiftUI)

### Step 1: Add Firebase SDK via Swift Package Manager

1. **Open Xcode** → Your iOS project
2. **File** → **Add Packages**
3. **Enter repository URL**:
   ```
   https://github.com/firebase/firebase-ios-sdk
   ```
4. **Select version**: Latest (or specific version like `11.x.x`)
5. **Choose products**:
   - ✅ **FirebaseAnalytics** (or **FirebaseAnalyticsWithoutAdId**)
   - ✅ **FirebaseMessaging**
6. Click **Add Package**

### Step 2: Add GoogleService-Info.plist

1. **Drag and drop** `GoogleService-Info.plist` into Xcode project
2. ✅ Check **"Copy items if needed"**
3. ✅ Select **your app target**
4. Verify it appears in **Project Navigator**

### Step 3: Configure App Capabilities

1. **Select your project** in Xcode
2. **Select your app target**
3. **Signing & Capabilities** tab
4. Click **"+ Capability"**:
   - Add **Push Notifications**
   - Add **Background Modes**
     - Check: **Remote notifications**

### Step 4: Initialize Firebase (SwiftUI)

Replace your `@main` app file:

```swift
import SwiftUI
import FirebaseCore
import FirebaseMessaging

class AppDelegate: NSObject, UIApplicationDelegate {
  func application(_ application: UIApplication,
                   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    // Initialize Firebase
    FirebaseApp.configure()

    // Set FCM delegate
    Messaging.messaging().delegate = self

    // Request notification permission
    UNUserNotificationCenter.current().delegate = self
    let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
    UNUserNotificationCenter.current().requestAuthorization(
      options: authOptions,
      completionHandler: { granted, _ in
        print("Notification permission granted: \(granted)")
      }
    )

    application.registerForRemoteNotifications()

    return true
  }

  func application(_ application: UIApplication,
                   didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
  }
}

// FCM Delegate
extension AppDelegate: MessagingDelegate {
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    print("FCM Token: \(fcmToken ?? "nil")")

    // Send token to your backend
    if let token = fcmToken {
      sendTokenToServer(token)
    }
  }

  func sendTokenToServer(_ token: String) {
    // POST to https://api.ideaspark.app/api/v1/notifications/register
    // (Implementation similar to Flutter example)
  }
}

// Notification Delegate
extension AppDelegate: UNUserNotificationCenterDelegate {
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    // Show notification even when app is in foreground
    completionHandler([[.banner, .badge, .sound]])
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    // Handle notification tap
    let userInfo = response.notification.request.content.userInfo
    print("Notification tapped with data: \(userInfo)")

    completionHandler()
  }
}

@main
struct IdeaSparkApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

  var body: some Scene {
    WindowGroup {
      NavigationView {
        ContentView()
      }
    }
  }
}
```

---

## React Native Integration

### Step 1: Install React Native Firebase

```bash
# Install Firebase packages
npm install @react-native-firebase/app @react-native-firebase/messaging

# Install iOS pods
cd ios
pod install
cd ..
```

### Step 2: Add GoogleService-Info.plist

```bash
# Copy to iOS project
cp ~/Downloads/GoogleService-Info.plist ios/
```

Open Xcode:
```bash
cd ios
open IdeaSpark.xcworkspace
```

**Add to Xcode**:
- Drag `GoogleService-Info.plist` into Xcode project
- ✅ Check "Copy items if needed"
- ✅ Select your app target

### Step 3: Configure Capabilities

Same as Native iOS (Step 3 above)

### Step 4: Implement Notification Service

Create `src/services/NotificationService.js`:

```javascript
import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';

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

      // Send to backend
      await this._sendTokenToServer(token);

      // Listen for token refresh
      messaging().onTokenRefresh(newToken => {
        this._sendTokenToServer(newToken);
      });

      // Handle foreground messages
      messaging().onMessage(async remoteMessage => {
        console.log('Foreground message:', remoteMessage);
      });

      // Handle notification taps
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification tapped:', remoteMessage.data);
      });

      // Check if opened from notification
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        console.log('App opened from notification:', initialNotification);
      }
    }
  }

  async _sendTokenToServer(token) {
    try {
      const response = await fetch('https://api.ideaspark.app/api/v1/notifications/register', {
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

      if (response.ok) {
        console.log('Token registered successfully');
      }
    } catch (error) {
      console.error('Failed to register token:', error);
    }
  }
}
```

### Step 5: Use in App

```javascript
import {NotificationService} from './services/NotificationService';

function App() {
  useEffect(() => {
    const notificationService = new NotificationService();
    notificationService.initialize();
  }, []);

  return <YourAppContent />;
}
```

---

## Testing Checklist

### iOS Device Testing
- [ ] App builds without errors
- [ ] GoogleService-Info.plist added to Xcode project
- [ ] Push Notifications capability enabled
- [ ] Background Modes → Remote notifications enabled
- [ ] App requests notification permission
- [ ] FCM token printed in console
- [ ] FCM token sent to backend successfully
- [ ] Backend returns 201 Created
- [ ] Notification received when app in foreground
- [ ] Notification received when app in background
- [ ] Notification tap opens app
- [ ] Notification tap navigates to correct screen

---

## Troubleshooting

### Error: "GoogleService-Info.plist not found"
**Solution**: Ensure file is added to Xcode project (not just copied to folder)

### Error: "No Firebase App '[DEFAULT]' has been created"
**Solution**: Call `FirebaseApp.configure()` before using any Firebase services

### FCM Token is `null`
**Possible causes**:
- App not running on real device (Simulator doesn't support push)
- User denied notification permission
- APNs certificate not uploaded to Firebase Console
- Bundle ID mismatch

### Notifications not appearing
**Checklist**:
- [ ] Real device (not Simulator)
- [ ] Notification permission granted
- [ ] APNs key uploaded to Firebase
- [ ] Bundle ID matches everywhere
- [ ] Device not in Do Not Disturb mode

---

## Next Steps

After integration:
1. Build app on real iOS device
2. Grant notification permission
3. Copy FCM token from console
4. Test sending notification from backend
5. Verify notification appears on device

## Support

- **Firebase iOS SDK Docs**: https://firebase.google.com/docs/ios/setup
- **Flutter Firebase**: https://firebase.flutter.dev
- **React Native Firebase**: https://rnfirebase.io
- **IdeaSpark Backend**: Contact server team for API details
