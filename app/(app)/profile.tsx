import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl, Alert as RNAlert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  ButtonText,
  ButtonIcon,
  Badge,
  BadgeText,
  Input,
  InputField,
  InputSlot,
  InputIcon,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  Alert,
  AlertIcon,
  AlertText,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  Pressable,
  Spinner,
  Icon,
  Center,
  Switch,
  Divider,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionTitleText,
  AccordionContent,
  AccordionContentText,
  AccordionIcon,
} from "@gluestack-ui/themed";
import {
  Crown,
  ChevronRight,
  Edit3,
  Lock,
  Receipt,
  Moon,
  Bell,
  Mail,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
  Trash2,
  CheckCircle,
  Camera,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Zap,
  MessageSquare,
  Activity,
  Calendar,
  User,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from '@/contexts/ThemeContext';
import {
  useProfile,
  useUpdateProfile,
  useChangePassword,
  useDeleteAccount,
  useUploadAvatar,
  useUserStats,
} from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, AnimatedOrb } from '@/components/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('ProfileScreen');
  const insets = useSafeAreaInsets();

  const isDark = colorMode === 'dark';

  // API hooks
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: stats, refetch: refetchStats } = useUserStats();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const uploadAvatar = useUploadAvatar();

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const [editName, setEditName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Preferences
  const [isDarkMode, setIsDarkMode] = useState(isDark);
  const [notifications, setNotifications] = useState(profile?.preferences?.pushNotifications ?? true);
  const [marketingEmails, setMarketingEmails] = useState(profile?.preferences?.marketingEmails ?? false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setNotifications(profile.preferences?.pushNotifications ?? true);
      setMarketingEmails(profile.preferences?.marketingEmails ?? false);
    }
  }, [profile]);

  useEffect(() => {
    setIsDarkMode(isDark);
  }, [isDark]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchProfile(), refetchStats()]);
    setIsRefreshing(false);
  };

  const handleDarkModeToggle = async () => {
    toggleColorMode();
    setIsDarkMode(!isDarkMode);
  };

  const handleNotificationToggle = async () => {
    const newValue = !notifications;
    setNotifications(newValue);
    try {
      await updateProfile.mutateAsync({
        preferences: {
          ...profile?.preferences,
          pushNotifications: newValue,
        },
      });
      toast.success('Preferences updated');
    } catch (err: any) {
      handleError(err, 'Failed to update notification preferences');
      setNotifications(!newValue);
    }
  };

  const handleMarketingToggle = async () => {
    const newValue = !marketingEmails;
    setMarketingEmails(newValue);
    try {
      await updateProfile.mutateAsync({
        preferences: {
          ...profile?.preferences,
          marketingEmails: newValue,
        },
      });
      toast.success('Preferences updated');
    } catch (err: any) {
      handleError(err, 'Failed to update marketing preferences');
      setMarketingEmails(!newValue);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: editName.trim() });
      toast.success('Profile updated successfully');
      setShowEditProfile(false);
      refetchProfile();
    } catch (err: any) {
      handleError(err, 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await changePassword.mutateAsync({
        oldPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      handleError(err, err.message || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    RNAlert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync({ password: deletePassword });
              toast.success('Account deleted successfully');
              await signOut();
            } catch (err: any) {
              handleError(err, err.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleAvatarUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Permission denied', 'We need camera roll permissions to upload an avatar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploading(true);
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();

        await uploadAvatar.mutateAsync(blob);
        toast.success('Avatar uploaded successfully');
        refetchProfile();
      } catch (err: any) {
        handleError(err, 'Failed to upload avatar');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSignOut = async () => {
    RNAlert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)');
          } catch (err: any) {
            handleError(err, 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const formatMemberSince = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  if (profileLoading) {
    return (
      <Box flex={1}>
        <GradientBackground>
          <Center flex={1}>
            <AnimatedOrb size={100} icon="sparkles" />
            <Text mt="$8" color={isDark ? "$white" : "$textLight900"} size="xl" fontWeight="$semibold">
              Loading profile...
            </Text>
          </Center>
        </GradientBackground>
      </Box>
    );
  }

  return (
    <Box flex={1}>
      <GradientBackground>
        {/* Enhanced Header with Profile Card */}
        <Box px="$5" pt={insets.top + 24} pb="$8">
          <GlassCard p="$8" opacity={0.1}>
            <VStack space="lg" alignItems="center">
              <Pressable onPress={handleAvatarUpload}>
                <Box position="relative">
                  <Avatar size="2xl" bg="$primary200" borderWidth={4} borderColor={isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}>
                    {profile?.avatar ? (
                      <AvatarImage source={{ uri: profile.avatar }} alt={profile?.name || 'User'} />
                    ) : (
                      <AvatarFallbackText fontSize="$4xl" fontWeight="$bold">
                        {profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email?.[0].toUpperCase()}
                      </AvatarFallbackText>
                    )}
                  </Avatar>
                  {isUploading ? (
                    <Box 
                      position="absolute" 
                      bottom={4} 
                      right={4} 
                      bg={isDark ? "rgba(255,255,255,0.2)" : "$white"} 
                      borderRadius="$full" 
                      p="$3"
                      shadowColor="$black"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowOpacity={0.3}
                      shadowRadius={8}
                    >
                      <Spinner size="small" color="$primary500" />
                    </Box>
                  ) : (
                    <Box 
                      position="absolute" 
                      bottom={4} 
                      right={4} 
                      bg="$primary600" 
                      borderRadius="$full" 
                      p="$3"
                      shadowColor="$primary600"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowOpacity={0.4}
                      shadowRadius={8}
                    >
                      <Icon as={Camera} size="md" color="$white" />
                    </Box>
                  )}
                </Box>
              </Pressable>

              <VStack space="sm" alignItems="center">
                <Heading size="2xl" color={isDark ? "$white" : "$textLight900"} textAlign="center" lineHeight="$2xl">
                  {profile?.name || 'User'}
                </Heading>
                <Text color={isDark ? "$textDark300" : "$textLight600"} size="md" textAlign="center">
                  {profile?.email}
                </Text>

                <HStack space="md" alignItems="center" mt="$3">
                  {profile?.subscriptionPlan === 'PRO' ? (
                    <Box
                      bg="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                      px="$5"
                      py="$2"
                      borderRadius="$full"
                      shadowColor="$success600"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowOpacity={0.3}
                      shadowRadius={8}
                    >
                      <HStack space="xs" alignItems="center">
                        <Icon as={Crown} size="sm" color="$white" />
                        <Text color="$white" fontWeight="$bold" fontSize="$md">Pro Member</Text>
                      </HStack>
                    </Box>
                  ) : (
                    <Box
                      bg="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                      px="$5"
                      py="$2"
                      borderRadius="$full"
                      shadowColor="$warning600"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowOpacity={0.3}
                      shadowRadius={8}
                    >
                      <Text color="$white" fontWeight="$bold" fontSize="$md">Free Plan</Text>
                    </Box>
                  )}

                  {profile?.emailVerified && (
                    <Box
                      bg={isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.15)"}
                      px="$4"
                      py="$2"
                      borderRadius="$full"
                      borderWidth={1}
                      borderColor="$info500"
                    >
                      <HStack space="xs" alignItems="center">
                        <Icon as={CheckCircle} size="xs" color="$info600" />
                        <Text color="$info600" fontWeight="$bold" fontSize="$sm">Verified</Text>
                      </HStack>
                    </Box>
                  )}
                </HStack>
              </VStack>

              <Pressable
                onPress={() => setShowEditProfile(true)}
                mt="$2"
              >
                <Box
                  bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                  px="$6"
                  py="$3"
                  borderRadius="$full"
                  borderWidth={2}
                  borderColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                  sx={{
                    ':active': {
                      transform: [{ scale: 0.95 }]
                    }
                  }}
                >
                  <HStack space="sm" alignItems="center">
                    <Icon as={Edit3} size="sm" color={isDark ? "$textDark200" : "$textLight700"} />
                    <Text color={isDark ? "$textDark200" : "$textLight700"} fontWeight="$semibold" fontSize="$md">
                      Edit Profile
                    </Text>
                  </HStack>
                </Box>
              </Pressable>
            </VStack>
          </GlassCard>
        </Box>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <VStack space="xl" px="$5" pb="$8">
            {/* Enhanced Statistics Card */}
            {stats && (
              <GlassCard p="$6" opacity={0.08}>
                <VStack space="lg">
                  <Heading size="xl" color={isDark ? "$white" : "$textLight900"}>
                    Your Statistics
                  </Heading>
                  <HStack space="lg" flexWrap="wrap" justifyContent="space-between">
                    <VStack space="sm" minWidth="45%" mb="$4">
                      <Box
                        bg="rgba(139,92,246,0.2)"
                        p="$3"
                        borderRadius="$xl"
                        alignSelf="flex-start"
                      >
                        <Icon as={Sparkles} size="lg" color="$primary600" />
                      </Box>
                      <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"} fontWeight="$medium">Total Ideas</Text>
                      <Text size="2xl" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>
                        {stats.totalIdeas}
                      </Text>
                    </VStack>

                    <VStack space="sm" minWidth="45%" mb="$4">
                      <Box
                        bg="rgba(59,130,246,0.2)"
                        p="$3"
                        borderRadius="$xl"
                        alignSelf="flex-start"
                      >
                        <Icon as={MessageSquare} size="lg" color="$info600" />
                      </Box>
                      <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"} fontWeight="$medium">Total Messages</Text>
                      <Text size="2xl" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>
                        {stats.totalMessages}
                      </Text>
                    </VStack>

                    <VStack space="sm" minWidth="45%">
                      <Box
                        bg="rgba(16,185,129,0.2)"
                        p="$3"
                        borderRadius="$xl"
                        alignSelf="flex-start"
                      >
                        <Icon as={TrendingUp} size="lg" color="$success600" />
                      </Box>
                      <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"} fontWeight="$medium">Active Ideas</Text>
                      <Text size="2xl" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>
                        {stats.activeIdeas}
                      </Text>
                    </VStack>

                    <VStack space="sm" minWidth="45%">
                      <Box
                        bg="rgba(245,158,11,0.2)"
                        p="$3"
                        borderRadius="$xl"
                        alignSelf="flex-start"
                      >
                        <Icon as={Calendar} size="lg" color="$warning600" />
                      </Box>
                      <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"} fontWeight="$medium">Member Since</Text>
                      <Text size="lg" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>
                        {formatMemberSince(stats.memberSince)}
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </GlassCard>
            )}

            {/* Account Section */}
            <VStack space="md">
              <Heading size="xl" color={isDark ? "$white" : "$textLight900"} px="$1">
                Account
              </Heading>

              {profile?.subscriptionPlan === 'FREE' && (
                <Pressable onPress={() => router.push('/(app)/upgrade')}>
                  <GlassCard 
                    p="$5" 
                    opacity={0.08}
                    bg={isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.05)"}
                    borderWidth={2}
                    borderColor="$warning500"
                    sx={{
                      ':active': {
                        transform: [{ scale: 0.98 }]
                      }
                    }}
                  >
                    <HStack space="md" alignItems="center" justifyContent="space-between">
                      <HStack space="md" alignItems="center" flex={1}>
                        <Box
                          bg="rgba(245,158,11,0.2)"
                          p="$3"
                          borderRadius="$xl"
                        >
                          <Icon as={Crown} size="xl" color="$warning600" />
                        </Box>
                        <VStack flex={1}>
                          <Text fontWeight="$bold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                            Upgrade to Pro
                          </Text>
                          <Text size="md" color={isDark ? "$textDark300" : "$textLight600"} lineHeight="$md">
                            Get unlimited ideas and AI replies
                          </Text>
                        </VStack>
                      </HStack>
                      <Icon as={ChevronRight} size="xl" color={isDark ? "$textDark300" : "$textLight400"} />
                    </HStack>
                  </GlassCard>
                </Pressable>
              )}

              <Pressable onPress={() => setShowChangePassword(true)}>
                <GlassCard p="$5" opacity={0.08}>
                  <HStack space="md" alignItems="center" justifyContent="space-between">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Box
                        bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                        p="$3"
                        borderRadius="$xl"
                      >
                        <Icon as={Lock} size="lg" color={isDark ? "$textDark300" : "$textLight500"} />
                      </Box>
                      <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                        Change Password
                      </Text>
                    </HStack>
                    <Icon as={ChevronRight} size="lg" color={isDark ? "$textDark400" : "$textLight400"} />
                  </HStack>
                </GlassCard>
              </Pressable>

              <Pressable>
                <GlassCard p="$5" opacity={0.08}>
                  <HStack space="md" alignItems="center" justifyContent="space-between">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Box
                        bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                        p="$3"
                        borderRadius="$xl"
                      >
                        <Icon as={Receipt} size="lg" color={isDark ? "$textDark300" : "$textLight500"} />
                      </Box>
                      <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                        Billing History
                      </Text>
                    </HStack>
                    <Icon as={ChevronRight} size="lg" color={isDark ? "$textDark400" : "$textLight400"} />
                  </HStack>
                </GlassCard>
              </Pressable>
            </VStack>

            {/* Preferences Section */}
            <VStack space="md">
              <Heading size="xl" color={isDark ? "$white" : "$textLight900"} px="$1">
                Preferences
              </Heading>

              <GlassCard p="$5" opacity={0.08}>
                <VStack space="md">
                  <HStack space="md" alignItems="center" justifyContent="space-between">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Box
                        bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                        p="$3"
                        borderRadius="$xl"
                      >
                        <Icon as={Moon} size="lg" color={isDark ? "$textDark300" : "$textLight500"} />
                      </Box>
                      <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                        Dark Mode
                      </Text>
                    </HStack>
                    <Switch
                      value={isDarkMode}
                      onToggle={handleDarkModeToggle}
                      size="lg"
                    />
                  </HStack>

                  <Divider bg={isDark ? "rgba(255,255,255,0.1)" : "$borderLight200"} />

                  <HStack space="md" alignItems="center" justifyContent="space-between">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Box
                        bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                        p="$3"
                        borderRadius="$xl"
                      >
                        <Icon as={Bell} size="lg" color={isDark ? "$textDark300" : "$textLight500"} />
                      </Box>
                      <VStack flex={1}>
                        <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                          Push Notifications
                        </Text>
                        <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>
                          Get notified when AI responds
                        </Text>
                      </VStack>
                    </HStack>
                    <Switch
                      value={notifications}
                      onToggle={handleNotificationToggle}
                      size="lg"
                    />
                  </HStack>

                  <Divider bg={isDark ? "rgba(255,255,255,0.1)" : "$borderLight200"} />

                  <HStack space="md" alignItems="center" justifyContent="space-between">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Box
                        bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                        p="$3"
                        borderRadius="$xl"
                      >
                        <Icon as={Mail} size="lg" color={isDark ? "$textDark300" : "$textLight500"} />
                      </Box>
                      <VStack flex={1}>
                        <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                          Marketing Emails
                        </Text>
                        <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>
                          Receive tips and updates
                        </Text>
                      </VStack>
                    </HStack>
                    <Switch
                      value={marketingEmails}
                      onToggle={handleMarketingToggle}
                      size="lg"
                    />
                  </HStack>
                </VStack>
              </GlassCard>
            </VStack>

            {/* Support Section */}
            <VStack space="md">
              <Heading size="xl" color={isDark ? "$white" : "$textLight900"} px="$1">
                Support
              </Heading>

              <GlassCard p="$5" opacity={0.08}>
                <VStack space="md">
                  <Pressable>
                    <HStack space="md" alignItems="center" justifyContent="space-between">
                      <HStack space="md" alignItems="center" flex={1}>
                        <Box
                          bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                          p="$3"
                          borderRadius="$xl"
                        >
                          <Icon as={HelpCircle} size="lg" color={isDark ? "$textDark300" : "$textLight500"} />
                        </Box>
                        <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                          Help & FAQ
                        </Text>
                      </HStack>
                      <Icon as={ChevronRight} size="lg" color={isDark ? "$textDark400" : "$textLight400"} />
                    </HStack>
                  </Pressable>

                  <Divider bg={isDark ? "rgba(255,255,255,0.1)" : "$borderLight200"} />

                  <Pressable>
                    <HStack space="md" alignItems="center" justifyContent="space-between">
                      <HStack space="md" alignItems="center" flex={1}>
                        <Box
                          bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                          p="$3"
                          borderRadius="$xl"
                        >
                          <Icon as={FileText} size="lg" color={isDark ? "$textDark300" : "$textLight500"} />
                        </Box>
                        <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                          Terms of Service
                        </Text>
                      </HStack>
                      <Icon as={ChevronRight} size="lg" color={isDark ? "$textDark400" : "$textLight400"} />
                    </HStack>
                  </Pressable>

                  <Divider bg={isDark ? "rgba(255,255,255,0.1)" : "$borderLight200"} />

                  <Pressable>
                    <HStack space="md" alignItems="center" justifyContent="space-between">
                      <HStack space="md" alignItems="center" flex={1}>
                        <Box
                          bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                          p="$3"
                          borderRadius="$xl"
                        >
                          <Icon as={Shield} size="lg" color={isDark ? "$textDark300" : "$textLight500"} />
                        </Box>
                        <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                          Privacy Policy
                        </Text>
                      </HStack>
                      <Icon as={ChevronRight} size="lg" color={isDark ? "$textDark400" : "$textLight400"} />
                    </HStack>
                  </Pressable>
                </VStack>
              </GlassCard>
            </VStack>

            {/* Danger Zone */}
            <VStack space="md">
              <Heading size="xl" color="$error600" px="$1">
                Danger Zone
              </Heading>

              <Pressable onPress={handleSignOut}>
                <GlassCard p="$5" opacity={0.08}>
                  <HStack space="md" alignItems="center">
                    <Box
                      bg="rgba(239,68,68,0.2)"
                      p="$3"
                      borderRadius="$xl"
                    >
                      <Icon as={LogOut} size="lg" color="$error600" />
                    </Box>
                    <Text fontWeight="$semibold" size="lg" color="$error600">
                      Sign Out
                    </Text>
                  </HStack>
                </GlassCard>
              </Pressable>

              <Pressable onPress={() => setShowDeleteAccount(true)}>
                <GlassCard p="$5" opacity={0.08} bg="rgba(239,68,68,0.05)">
                  <HStack space="md" alignItems="center">
                    <Box
                      bg="rgba(239,68,68,0.2)"
                      p="$3"
                      borderRadius="$xl"
                    >
                      <Icon as={Trash2} size="lg" color="$error600" />
                    </Box>
                    <Text fontWeight="$semibold" size="lg" color="$error600">
                      Delete Account
                    </Text>
                  </HStack>
                </GlassCard>
              </Pressable>
            </VStack>
          </VStack>
        </ScrollView>
      </GradientBackground>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent bg={isDark ? "$backgroundDark900" : "$white"}>
          <ModalHeader borderBottomWidth={1} borderColor={isDark ? "$borderDark800" : "$borderLight200"}>
            <Heading size="xl">Edit Profile</Heading>
            <ModalCloseButton>
              <Icon as={X} size="lg" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody py="$6">
            <FormControl>
              <FormControlLabel mb="$2">
                <FormControlLabelText fontWeight="$semibold" size="md">Name</FormControlLabelText>
              </FormControlLabel>
              <Input variant="outline" size="xl">
                <InputField
                  placeholder="Enter your name"
                  value={editName}
                  onChangeText={setEditName}
                />
              </Input>
            </FormControl>
          </ModalBody>
          <ModalFooter borderTopWidth={1} borderColor={isDark ? "$borderDark800" : "$borderLight200"}>
            <HStack space="md" flex={1}>
              <Button
                variant="outline"
                action="secondary"
                onPress={() => setShowEditProfile(false)}
                flex={1}
                size="lg"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="primary"
                onPress={handleUpdateProfile}
                isDisabled={updateProfile.isPending || !editName.trim()}
                flex={1}
                size="lg"
              >
                {updateProfile.isPending ? (
                  <Spinner color="$white" />
                ) : (
                  <ButtonText>Save</ButtonText>
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent bg={isDark ? "$backgroundDark900" : "$white"}>
          <ModalHeader borderBottomWidth={1} borderColor={isDark ? "$borderDark800" : "$borderLight200"}>
            <Heading size="xl">Change Password</Heading>
            <ModalCloseButton>
              <Icon as={X} size="lg" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody py="$6">
            <VStack space="lg">
              <FormControl>
                <FormControlLabel mb="$2">
                  <FormControlLabelText fontWeight="$semibold" size="md">Current Password</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="xl">
                  <InputField
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={!showOldPassword}
                  />
                  <InputSlot pr="$3" onPress={() => setShowOldPassword(!showOldPassword)}>
                    <InputIcon as={showOldPassword ? EyeOff : Eye} />
                  </InputSlot>
                </Input>
              </FormControl>

              <FormControl>
                <FormControlLabel mb="$2">
                  <FormControlLabelText fontWeight="$semibold" size="md">New Password</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="xl">
                  <InputField
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <InputSlot pr="$3" onPress={() => setShowNewPassword(!showNewPassword)}>
                    <InputIcon as={showNewPassword ? EyeOff : Eye} />
                  </InputSlot>
                </Input>
              </FormControl>

              <FormControl>
                <FormControlLabel mb="$2">
                  <FormControlLabelText fontWeight="$semibold" size="md">Confirm New Password</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="xl">
                  <InputField
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <InputSlot pr="$3" onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <InputIcon as={showConfirmPassword ? EyeOff : Eye} />
                  </InputSlot>
                </Input>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth={1} borderColor={isDark ? "$borderDark800" : "$borderLight200"}>
            <HStack space="md" flex={1}>
              <Button
                variant="outline"
                action="secondary"
                onPress={() => {
                  setShowChangePassword(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                flex={1}
                size="lg"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="primary"
                onPress={handleChangePassword}
                isDisabled={changePassword.isPending}
                flex={1}
                size="lg"
              >
                {changePassword.isPending ? (
                  <Spinner color="$white" />
                ) : (
                  <ButtonText>Change Password</ButtonText>
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent bg={isDark ? "$backgroundDark900" : "$white"}>
          <ModalHeader borderBottomWidth={1} borderColor={isDark ? "$borderDark800" : "$borderLight200"}>
            <Heading size="xl" color="$error600">Delete Account</Heading>
            <ModalCloseButton>
              <Icon as={X} size="lg" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody py="$6">
            <VStack space="lg">
              <Alert action="error" variant="solid">
                <AlertIcon as={AlertTriangle} mr="$3" />
                <VStack flex={1}>
                  <AlertText fontWeight="$bold" size="md">This action cannot be undone!</AlertText>
                  <AlertText size="sm" mt="$1">
                    All your ideas, messages, and subscription will be permanently deleted.
                  </AlertText>
                </VStack>
              </Alert>

              <FormControl>
                <FormControlLabel mb="$2">
                  <FormControlLabelText fontWeight="$semibold" size="md">Enter your password to confirm</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="xl">
                  <InputField
                    placeholder="Enter password"
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    secureTextEntry
                  />
                </Input>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth={1} borderColor={isDark ? "$borderDark800" : "$borderLight200"}>
            <HStack space="md" flex={1}>
              <Button
                variant="outline"
                action="secondary"
                onPress={() => {
                  setShowDeleteAccount(false);
                  setDeletePassword('');
                }}
                flex={1}
                size="lg"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="negative"
                onPress={handleDeleteAccount}
                isDisabled={deleteAccount.isPending || !deletePassword}
                flex={1}
                size="lg"
              >
                {deleteAccount.isPending ? (
                  <Spinner color="$white" />
                ) : (
                  <ButtonText>Delete Account</ButtonText>
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
