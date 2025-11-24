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
import {
  HeaderGradient,
  SectionCard,
  SettingsRow,
  ToggleRow,
  PrimaryButton,
  InlineNotice,
} from '@/components/ui';
import { colors, space } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colorMode } = useTheme();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('ProfileScreen');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(colorMode === 'dark');
  const [notifications, setNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const isPro = user?.subscriptionPlan === 'PRO';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Add your refresh logic here
    setTimeout(() => setIsRefreshing(false), 1000);
  };

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

  const handleDeleteAccount = () => {
    RNAlert.alert(
      'Delete Account',
      'Are you sure? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Add delete account logic here
              toast.success('Account Deleted', 'Your account has been deleted');
              await signOut();
              router.replace('/(auth)');
            } catch (error: any) {
              handleError(error, 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkMode(value);
    // Wire up to actual theme toggle
    // toggleColorMode();
    toast.showToast({
      type: 'info',
      title: 'Coming Soon',
      message: 'Dark mode will be available in the next update',
      duration: 3000,
    });
  };

  return (
    <Box flex={1} bg={colors.surfaceMuted}>
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
          onUpgrade={() => router.push('/(app)/upgrade')}
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
                    onPress={() => router.push('/(app)/upgrade')}
                  />
                )}
                <Divider bg={colors.borderMuted} />
                <SettingsRow
                  icon={Lock}
                  label="Change Password"
                  onPress={() => {
                    toast.showToast({
                      type: 'info',
                      title: 'Coming Soon',
                      message: 'Password change will be available soon',
                      duration: 3000,
                    });
                  }}
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
                  onValueChange={setNotifications}
                />
                <Divider bg={colors.borderMuted} />
                <ToggleRow
                  icon={Mail}
                  label="Marketing Emails"
                  description="Receive tips and product updates"
                  value={marketingEmails}
                  onValueChange={setMarketingEmails}
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
                  onPress={handleDeleteAccount}
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
    </Box>
  );
}
