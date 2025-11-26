import React, { useState } from 'react';
import { ScrollView, RefreshControl, Alert as RNAlert, Linking, Platform } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  AvatarFallbackText,
  Divider,
} from "@gluestack-ui/themed";
import {
  Crown,
  Lock,
  Receipt,
  Moon,
  Bell,
  Mail,
  HelpCircle,
  LogOut,
  Trash2,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useUpdateNotificationPreferences, useDeleteAccount } from '@/hooks/useApi';
import {
  HeaderGradient,
  SectionCard,
  SettingsRow,
  ToggleRow,
  PrimaryButton,
  InlineNotice,
  ChangePasswordModal,
  DeleteAccountModal,
} from '@/components/ui';
import { space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useAnalytics } from '@/hooks/useAnalytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, changePassword } = useAuth();
  const { colorMode, toggleDarkMode } = useTheme();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('ProfileScreen');
  const { setUserConsent } = useAnalytics();
  const { colors } = useThemedColors();
  const updateNotificationPreferences = useUpdateNotificationPreferences();
  const deleteAccount = useDeleteAccount();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(colorMode === 'dark');
  const [notifications, setNotifications] = useState<boolean>(() => {
    const prefs = (user as any)?.preferences || {};
    const notif = prefs.notifications || {};
    return typeof notif.push === 'boolean' ? notif.push : true;
  });
  const [marketingEmails, setMarketingEmails] = useState<boolean>(() => {
    const prefs = (user as any)?.preferences || {};
    const notif = prefs.notifications || {};
    return typeof notif.marketing === 'boolean' ? notif.marketing : false;
  });
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isPro = user?.subscriptionPlan === 'PRO';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Add your refresh logic here
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Load persisted analytics consent
  React.useEffect(() => {
    AsyncStorage.getItem('analyticsConsent')
      .then((value) => {
        setAnalyticsEnabled(value === 'true');
      })
      .catch((error) => {
        logger.warn('Failed to load analytics consent', error);
      });
  }, []);

  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed Out', 'See you next time!');
      router.replace('/(auth)');
    } catch (error: any) {
      handleError(error, 'Failed to sign out');
    }
  };

  const handleDeleteAccountConfirm = async (password: string) => {
    try {
      await deleteAccount.mutateAsync(password);
      toast.success('Account Deleted', 'Your account has been permanently deleted');
      setTimeout(async () => {
        await signOut();
        router.replace('/(auth)');
      }, 1000);
    } catch (error: any) {
      handleError(error, error.message || 'Failed to delete account');
      throw error;
    }
  };

  const handleDarkModeToggle = async (value: boolean) => {
    try {
      setDarkMode(value);
      await toggleDarkMode();
      toast.showToast({
        type: 'success',
        title: value ? 'Dark mode enabled' : 'Dark mode disabled',
        message: value
          ? 'IdeaSpark will now use a darker theme that is easier on your eyes.'
          : 'Switched back to the light theme.',
        duration: 2500,
      });
    } catch (error: any) {
      setDarkMode(!value);
      handleError(error, 'Failed to toggle dark mode');
    }
  };

  const handleAnalyticsToggle = async (value: boolean) => {
    setAnalyticsEnabled(value);
    try {
      await setUserConsent(value);
      toast.showToast({
        type: 'success',
        title: value ? 'Analytics enabled' : 'Analytics disabled',
        message: value
          ? 'We will use anonymized events to improve IdeaSpark.'
          : 'Analytics tracking has been turned off for this device.',
        duration: 3000,
      });
    } catch (error: any) {
      setAnalyticsEnabled(!value);
      handleError(error, 'Failed to update analytics preferences');
    }
  };

  const handlePushNotificationsToggle = async (value: boolean) => {
    setNotifications(value);
    try {
      await updateNotificationPreferences.mutateAsync({
        push: value,
      });
      toast.showToast({
        type: 'success',
        title: value ? 'Push notifications enabled' : 'Push notifications disabled',
        message: value
          ? 'You will now receive notifications about your ideas.'
          : 'Push notifications have been turned off.',
        duration: 2500,
      });
    } catch (error: any) {
      setNotifications(!value);
      handleError(error, 'Failed to update notification preferences');
    }
  };

  const handleMarketingEmailsToggle = async (value: boolean) => {
    setMarketingEmails(value);
    try {
      await updateNotificationPreferences.mutateAsync({
        marketing: value,
      });
      toast.showToast({
        type: 'success',
        title: value ? 'Marketing emails enabled' : 'Marketing emails disabled',
        message: value
          ? 'You will receive tips and product updates via email.'
          : 'Marketing emails have been turned off.',
        duration: 2500,
      });
    } catch (error: any) {
      setMarketingEmails(!value);
      handleError(error, 'Failed to update email preferences');
    }
  };

  const handleChangePasswordSubmit = async (currentPassword: string, newPassword: string) => {
    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      toast.success('Password Changed', 'You will be signed out. Please sign in with your new password.');
    } catch (error: any) {
      handleError(error, error.message || 'Failed to change password');
      throw error;
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Box
      flex={1}
      bg={colors.surfaceMuted}
      accessible
      accessibilityLabel="Profile and settings"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <HeaderGradient
          greeting="Profile"
          name={user?.name || 'User'}
          showUpgradeButton={!isPro}
          onUpgrade={() =>
            router.push({
              pathname: '/(app)/upgrade',
              params: { source: 'profile_header' },
            })
          }
        />

        <VStack space="lg" px={space.lg} py={space.lg}>
          {/* Profile Card */}
          <SectionCard>
            <VStack space="md" alignItems="center">
              <Avatar size="xl" bg={colors.brand[500]}>
                <AvatarFallbackText>
                  {user?.name || user?.email || 'User'}
                </AvatarFallbackText>
              </Avatar>
              <VStack space="xs" alignItems="center">
                <Text color={colors.textPrimary} fontSize="$xl" fontWeight="$bold">
                  {user?.name || 'User'}
                </Text>
                <Text color={colors.textSecondary} fontSize="$sm">
                  {user?.email}
                </Text>
                {isPro && (
                  <HStack space="xs" alignItems="center" mt={space.xs}>
                    <Crown color={colors.success} size={16} />
                    <Text color={colors.success} fontSize="$sm" fontWeight="$semibold">
                      Pro Member
                    </Text>
                  </HStack>
                )}
              </VStack>
            </VStack>
          </SectionCard>

          {/* Account Section */}
          <VStack space="xs">
            <Text
              color={colors.textPrimary}
              fontSize="$md"
              fontWeight="$bold"
              px={space.xs}
              style={{ letterSpacing: 0.5 }}
            >
              ACCOUNT
            </Text>
            <SectionCard noPadding>
              <VStack>
                {isPro ? (
                  <SettingsRow
                    icon={Receipt}
                    label="Manage Subscription"
                    onPress={handleManageSubscription}
                  />
                ) : (
                  <SettingsRow
                    icon={Sparkles}
                    label="Upgrade to Pro"
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/upgrade',
                        params: { source: 'profile_settings_row' },
                      })
                    }
                  />
                )}
                <Divider bg={colors.borderMuted} />
                <SettingsRow
                  icon={Lock}
                  label="Change Password"
                  onPress={() => setShowChangePasswordModal(true)}
                />
              </VStack>
            </SectionCard>
          </VStack>

          {/* Preferences Section */}
          <VStack space="xs">
            <Text
              color={colors.textPrimary}
              fontSize="$md"
              fontWeight="$bold"
              px={space.xs}
              style={{ letterSpacing: 0.5 }}
            >
              PREFERENCES
            </Text>
            <SectionCard noPadding>
              <VStack px={space.md}>
                <ToggleRow
                  icon={Moon}
                  label="Dark Mode"
                  description="Switch between light and dark themes"
                  value={darkMode}
                  onValueChange={handleDarkModeToggle}
                />
                <Divider bg={colors.borderMuted} />
                <ToggleRow
                  icon={Bell}
                  label="Push Notifications"
                  description="Receive notifications about your ideas"
                  value={notifications}
                  onValueChange={handlePushNotificationsToggle}
                  isDisabled={updateNotificationPreferences.isPending}
                />
                <Divider bg={colors.borderMuted} />
                <ToggleRow
                  icon={Mail}
                  label="Marketing Emails"
                  description="Receive tips and product updates"
                  value={marketingEmails}
                  onValueChange={handleMarketingEmailsToggle}
                  isDisabled={updateNotificationPreferences.isPending}
                />
                <Divider bg={colors.borderMuted} />
                <ToggleRow
                  icon={Sparkles}
                  label="Usage analytics"
                  description="Share anonymous usage to help improve IdeaSpark"
                  value={analyticsEnabled}
                  onValueChange={handleAnalyticsToggle}
                />
              </VStack>
            </SectionCard>
          </VStack>

          {/* Support Section */}
          <VStack space="xs">
            <Text
              color={colors.textPrimary}
              fontSize="$md"
              fontWeight="$bold"
              px={space.xs}
              style={{ letterSpacing: 0.5 }}
            >
              SUPPORT
            </Text>
            <SectionCard noPadding>
              <VStack>
                <SettingsRow
                  icon={HelpCircle}
                  label="Help & FAQ"
                  onPress={() => {
                    Linking.openURL('https://ideaspark.app/faq');
                  }}
                />
                <Divider bg={colors.borderMuted} />
                <SettingsRow
                  icon={Mail}
                  label="Contact Support"
                  onPress={() => {
                    Linking.openURL('mailto:support@ideaspark.app');
                  }}
                />
              </VStack>
            </SectionCard>
          </VStack>

          {/* Danger Zone */}
          <VStack space="xs">
            <Text
              color={colors.textPrimary}
              fontSize="$md"
              fontWeight="$bold"
              px={space.xs}
              style={{ letterSpacing: 0.5 }}
            >
              DANGER ZONE
            </Text>
            <SectionCard noPadding>
              <VStack>
                <SettingsRow
                  icon={LogOut}
                  label="Sign Out"
                  onPress={handleSignOut}
                />
                <Divider bg={colors.borderMuted} />
                <SettingsRow
                  icon={Trash2}
                  label="Delete Account"
                  destructive
                  onPress={() => setShowDeleteAccountModal(true)}
                />
              </VStack>
            </SectionCard>
          </VStack>

          {/* App Version */}
          <Text color={colors.textSecondary} fontSize="$xs" textAlign="center" py={space.md}>
            IdeaSpark v1.0.0
          </Text>
        </VStack>
      </ScrollView>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => {}}
        onSubmit={handleChangePasswordSubmit}
        isLoading={isChangingPassword}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccountConfirm}
        isLoading={deleteAccount.isPending}
      />
    </Box>
  );
}
