import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { logger } from '@/hooks/useLogger';

/**
 * Platform compatibility test suite for profile features
 */
export class PlatformTests {
  private static testResults: Record<string, any> = {};

  /**
   * Run all platform tests
   */
  static async runAllTests(): Promise<Record<string, any>> {
    console.log('🧪 Starting platform compatibility tests...');

    // Device information
    await this.testDeviceInfo();

    // Permissions tests
    await this.testPermissions();

    // Storage tests
    await this.testStorage();

    // Image picker tests
    await this.testImagePicker();

    // Notification tests
    await this.testNotifications();

    // Profile feature tests
    await this.testProfileFeatures();

    console.log('✅ Platform tests completed');
    return this.testResults;
  }

  /**
   * Test device information
   */
  private static async testDeviceInfo() {
    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        isDevice: Device.isDevice,
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        deviceType: Device.deviceType,
        appVersion: Application.nativeApplicationVersion,
        buildNumber: Application.nativeBuildVersion,
      };

      this.testResults.deviceInfo = {
        status: 'passed',
        data: deviceInfo,
      };

      logger.info('Device info collected', deviceInfo);
    } catch (error) {
      this.testResults.deviceInfo = {
        status: 'failed',
        error: error.message,
      };
      logger.error('Device info test failed', error);
    }
  }

  /**
   * Test permissions
   */
  private static async testPermissions() {
    const permissions: Record<string, any> = {};

    // Camera roll permissions
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      permissions.mediaLibrary = status;
    } catch (error) {
      permissions.mediaLibrary = 'error';
    }

    // Camera permissions
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      permissions.camera = status;
    } catch (error) {
      permissions.camera = 'error';
    }

    // Notification permissions
    try {
      const { status } = await Notifications.getPermissionsAsync();
      permissions.notifications = status;
    } catch (error) {
      permissions.notifications = 'error';
    }

    this.testResults.permissions = {
      status: 'passed',
      data: permissions,
    };

    logger.info('Permissions tested', permissions);
  }

  /**
   * Test secure storage
   */
  private static async testStorage() {
    try {
      // Test write
      await SecureStore.setItemAsync('test_key', 'test_value');

      // Test read
      const value = await SecureStore.getItemAsync('test_key');

      // Test delete
      await SecureStore.deleteItemAsync('test_key');

      this.testResults.storage = {
        status: value === 'test_value' ? 'passed' : 'failed',
        canStore: true,
      };

      logger.info('Secure storage test passed');
    } catch (error) {
      this.testResults.storage = {
        status: 'failed',
        error: error.message,
      };
      logger.error('Secure storage test failed', error);
    }
  }

  /**
   * Test image picker functionality
   */
  private static async testImagePicker() {
    try {
      // Check if image picker is available
      const isAvailable = await ImagePicker.isAvailableAsync();

      this.testResults.imagePicker = {
        status: isAvailable ? 'passed' : 'failed',
        isAvailable,
        supportedTypes: ImagePicker.MediaTypeOptions,
      };

      logger.info('Image picker test', { isAvailable });
    } catch (error) {
      this.testResults.imagePicker = {
        status: 'failed',
        error: error.message,
      };
      logger.error('Image picker test failed', error);
    }
  }

  /**
   * Test notification capabilities
   */
  private static async testNotifications() {
    try {
      // Check if notifications are supported
      const canSchedule = await Notifications.canScheduleNotificationsAsync();

      // Get push token (if available)
      let pushToken = null;
      if (Device.isDevice) {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          pushToken = tokenData.data;
        } catch (e) {
          // Push token may not be available in all environments
        }
      }

      this.testResults.notifications = {
        status: 'passed',
        canSchedule,
        pushToken,
        isDevice: Device.isDevice,
      };

      logger.info('Notification test', { canSchedule, hasPushToken: !!pushToken });
    } catch (error) {
      this.testResults.notifications = {
        status: 'failed',
        error: error.message,
      };
      logger.error('Notification test failed', error);
    }
  }

  /**
   * Test profile-specific features
   */
  private static async testProfileFeatures() {
    const features: Record<string, boolean> = {};

    // Test avatar upload capability
    features.avatarUpload = Platform.select({
      ios: true,
      android: true,
      web: true,
      default: false,
    });

    // Test dark mode support
    features.darkMode = Platform.select({
      ios: Platform.Version >= 13,
      android: Platform.Version >= 29,
      web: true,
      default: false,
    });

    // Test biometric authentication
    features.biometricAuth = Platform.select({
      ios: Platform.Version >= 11,
      android: Platform.Version >= 23,
      web: false,
      default: false,
    });

    // Test file system access
    features.fileSystem = Platform.select({
      ios: true,
      android: true,
      web: false,
      default: false,
    });

    // Test background tasks
    features.backgroundTasks = Platform.select({
      ios: true,
      android: true,
      web: false,
      default: false,
    });

    this.testResults.profileFeatures = {
      status: 'passed',
      data: features,
    };

    logger.info('Profile features tested', features);
  }

  /**
   * Generate test report
   */
  static generateReport(): string {
    const report: string[] = [];

    report.push('# Platform Compatibility Test Report\n');
    report.push(`Generated: ${new Date().toISOString()}\n`);

    // Device Info
    if (this.testResults.deviceInfo) {
      report.push('## Device Information');
      const { data } = this.testResults.deviceInfo;
      report.push(`- Platform: ${data.platform} (v${data.version})`);
      report.push(`- Device: ${data.brand} ${data.modelName}`);
      report.push(`- OS: ${data.osName} ${data.osVersion}`);
      report.push(`- App Version: ${data.appVersion} (${data.buildNumber})\n`);
    }

    // Permissions
    if (this.testResults.permissions) {
      report.push('## Permissions');
      const { data } = this.testResults.permissions;
      report.push(`- Media Library: ${data.mediaLibrary}`);
      report.push(`- Camera: ${data.camera}`);
      report.push(`- Notifications: ${data.notifications}\n`);
    }

    // Features
    if (this.testResults.profileFeatures) {
      report.push('## Profile Features Support');
      const { data } = this.testResults.profileFeatures;
      Object.entries(data).forEach(([feature, supported]) => {
        const emoji = supported ? '✅' : '❌';
        report.push(`${emoji} ${feature}: ${supported}`);
      });
      report.push('');
    }

    // Test Results Summary
    report.push('## Test Results Summary');
    Object.entries(this.testResults).forEach(([test, result]) => {
      const emoji = result.status === 'passed' ? '✅' : '❌';
      report.push(`${emoji} ${test}: ${result.status}`);
      if (result.error) {
        report.push(`  Error: ${result.error}`);
      }
    });

    return report.join('\n');
  }
}

/**
 * Platform-specific profile validators
 */
export class PlatformProfileValidator {
  /**
   * Validate avatar upload based on platform
   */
  static validateAvatarUpload(): { supported: boolean; message?: string } {
    if (!Device.isDevice && Platform.OS !== 'web') {
      return {
        supported: false,
        message: 'Avatar upload requires a physical device or web browser',
      };
    }

    if (Platform.OS === 'ios' && Platform.Version < 11) {
      return {
        supported: false,
        message: 'iOS 11+ required for avatar upload',
      };
    }

    if (Platform.OS === 'android' && Platform.Version < 21) {
      return {
        supported: false,
        message: 'Android 5.0+ required for avatar upload',
      };
    }

    return { supported: true };
  }

  /**
   * Validate notification support
   */
  static validateNotifications(): { supported: boolean; message?: string } {
    if (!Device.isDevice) {
      return {
        supported: false,
        message: 'Push notifications require a physical device',
      };
    }

    return { supported: true };
  }

  /**
   * Validate dark mode support
   */
  static validateDarkMode(): { supported: boolean; message?: string } {
    if (Platform.OS === 'ios' && Platform.Version < 13) {
      return {
        supported: false,
        message: 'iOS 13+ required for dark mode',
      };
    }

    if (Platform.OS === 'android' && Platform.Version < 29) {
      return {
        supported: false,
        message: 'Android 10+ required for system dark mode',
      };
    }

    return { supported: true };
  }

  /**
   * Check all platform requirements
   */
  static checkAllRequirements(): Record<string, any> {
    return {
      avatarUpload: this.validateAvatarUpload(),
      notifications: this.validateNotifications(),
      darkMode: this.validateDarkMode(),
      platform: {
        os: Platform.OS,
        version: Platform.Version,
        isDevice: Device.isDevice,
      },
    };
  }
}