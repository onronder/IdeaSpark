import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Modal as RNModal,
  Linking,
  RefreshControl,
} from 'react-native';
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
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Switch,
  Divider,
  Pressable,
  Alert,
  AlertIcon,
  AlertText,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  Input,
  InputField,
  InputIcon,
  InputSlot,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Icon,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionTitleText,
  AccordionIcon,
  AccordionContent,
  Spinner,
  Center,
  Card,
} from "@gluestack-ui/themed";
import {
  User,
  Crown,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  Edit3,
  Mail,
  Lock,
  Moon,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Receipt,
  Trash2,
  Phone,
  X,
  AlertTriangle,
  Camera,
  Eye,
  EyeOff,
  CheckCircle,
  Calendar,
  Smartphone,
  Activity,
  MessageSquare,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import {
  useUserProfile,
  useUpdateProfile,
  useChangePassword,
  useUploadAvatar,
  useDeleteAccount,
  useUpdateNotifications,
  useUpdateTheme,
  useUserStats,
} from '@/hooks/useProfile';
import { useUsageSummary } from '@/hooks/useApi';
import { GradientBackground, GlassCard, AnimatedOrb } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode, colorMode } = useTheme();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('ProfileScreen');
  const insets = useSafeAreaInsets();

  const isDark = colorMode === 'dark';

  // API Hooks
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useUserProfile();
  const { data: usage } = useUsageSummary();
  const { data: stats } = useUserStats();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const updateNotifications = useUpdateNotifications();
  const updateTheme = useUpdateTheme();
  const { pickImage, uploadAvatar, isUploading } = useUploadAvatar();

  // Form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deletePassword, setDeletePassword] = useState('');

  // Modal visibility
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);

  // Settings state (from profile preferences)
  const [notifications, setNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setEditFormData({
        name: profile.name || '',
        email: profile.email,
      });

      const prefs = profile.preferences?.notifications;
      if (prefs) {
        setNotifications(prefs.push || false);
        setMarketingEmails(prefs.marketing || false);
      }
    }
  }, [profile]);

  // Handle dark mode toggle with backend persistence
  const handleDarkModeToggle = async (value: boolean) => {
    toggleDarkMode();

    // Save to backend
    try {
      await updateTheme.mutateAsync(value ? 'dark' : 'light');
    } catch (error) {
      // Revert on error
      toggleDarkMode();
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = async (value: boolean) => {
    setNotifications(value);

    try {
      await updateNotifications.mutateAsync({
        push: value,
        email: value,
        ideaUpdates: value,
      });
    } catch (error) {
      // Revert on error
      setNotifications(!value);
    }
  };

  // Handle marketing emails toggle
  const handleMarketingToggle = async (value: boolean) => {
    setMarketingEmails(value);

    try {
      await updateNotifications.mutateAsync({
        marketing: value,
        weeklyDigest: value,
      });
    } catch (error) {
      // Revert on error
      setMarketingEmails(!value);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!editFormData.name.trim()) {
      toast.error('Validation Error', 'Name is required');
      return;
    }

    if (!editFormData.email.trim() || !editFormData.email.includes('@')) {
      toast.error('Validation Error', 'Valid email is required');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        name: editFormData.name,
        email: editFormData.email,
      });
      setShowEditProfile(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!passwordFormData.currentPassword) {
      toast.error('Validation Error', 'Current password is required');
      return;
    }

    if (passwordFormData.newPassword.length < 8) {
      toast.error('Validation Error', 'New password must be at least 8 characters');
      return;
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      toast.error('Validation Error', 'Passwords do not match');
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword,
      });

      setShowChangePassword(false);
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    const image = await pickImage();
    if (image) {
      await uploadAvatar.mutateAsync(image.uri);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Validation Error', 'Password is required for account deletion');
      return;
    }

    try {
      await deleteAccount.mutateAsync(deletePassword);
      setShowDeleteAccount(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchProfile();
    setIsRefreshing(false);
  };

  // Format member since date
  const formatMemberSince = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (profileLoading) {
    return (
      <Box flex={1}>
        <GradientBackground>
          <Center flex={1}>
            <AnimatedOrb size={80} icon="sparkles" />
            <Text mt="$6" color={isDark ? "$white" : "$textLight900"} size="lg">
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
        {/* Header with Glassmorphism */}
        <Box px="$4" pt={insets.top + 20} pb="$6">
          <GlassCard p="$6" opacity={0.08}>
            <VStack space="md" alignItems="center">
              <Pressable onPress={handleAvatarUpload}>
                <Box position="relative">
                  <Avatar size="xl" bg="$primary100">
                    {profile?.avatar ? (
                      <AvatarImage source={{ uri: profile.avatar }} alt={profile?.name || 'User'} />
                    ) : (
                      <AvatarFallbackText>
                        {profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email?.[0].toUpperCase()}
                      </AvatarFallbackText>
                    )}
                  </Avatar>
                  {isUploading ? (
                    <Box position="absolute" bottom={0} right={0} bg={isDark ? "rgba(255,255,255,0.2)" : "$white"} borderRadius="$full" p="$1">
                      <Spinner size="small" color="$primary500" />
                    </Box>
                  ) : (
                    <Box position="absolute" bottom={0} right={0} bg="$primary500" borderRadius="$full" p="$1">
                      <Icon as={Camera} size="sm" color="$white" />
                    </Box>
                  )}
                </Box>
              </Pressable>

              <VStack space="xs" alignItems="center">
                <Heading size="lg" color={isDark ? "$white" : "$textLight900"}>{profile?.name || 'User'}</Heading>
                <Text color={isDark ? "$textDark400" : "$textLight600"} size="sm">{profile?.email}</Text>

                <HStack space="sm" alignItems="center" mt="$2">
                  {profile?.subscriptionPlan === 'PRO' ? (
                    <Badge action="success" variant="solid">
                      <Icon as={Crown} size="xs" color="$white" mr="$1" />
                      <BadgeText>Pro Member</BadgeText>
                    </Badge>
                  ) : (
                    <Badge action="warning" variant="solid">
                      <BadgeText>Free Plan</BadgeText>
                    </Badge>
                  )}

                  {profile?.emailVerified && (
                    <Badge action="info" variant="subtle">
                      <Icon as={CheckCircle} size="xs" color="$info600" mr="$1" />
                      <BadgeText>Verified</BadgeText>
                    </Badge>
                  )}
                </HStack>
              </VStack>

              <Button
                size="sm"
                variant="outline"
                action="secondary"
                onPress={() => setShowEditProfile(true)}
              >
                <ButtonIcon as={Edit3} mr="$1" />
                <ButtonText>Edit Profile</ButtonText>
              </Button>
            </VStack>
          </GlassCard>
        </Box>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <VStack space="lg" p="$4">
            {/* Statistics Card */}
            {stats && (
              <GlassCard p="$4" opacity={0.08}>
                <VStack space="md">
                  <Heading size="sm" color={isDark ? "$white" : "$textLight900"}>Your Statistics</Heading>
                  <HStack space="md" flexWrap="wrap">
                    <VStack space="xs" minWidth="45%">
                      <HStack space="xs" alignItems="center">
                        <Icon as={Zap} size="xs" color="$primary500" />
                        <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>Total Ideas</Text>
                      </HStack>
                      <Text size="lg" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>{stats.totalIdeas}</Text>
                    </VStack>

                    <VStack space="xs" minWidth="45%">
                      <HStack space="xs" alignItems="center">
                        <Icon as={MessageSquare} size="xs" color="$info500" />
                        <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>Total Messages</Text>
                      </HStack>
                      <Text size="lg" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>{stats.totalMessages}</Text>
                    </VStack>

                    <VStack space="xs" minWidth="45%">
                      <HStack space="xs" alignItems="center">
                        <Icon as={Activity} size="xs" color="$success500" />
                        <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>Active Ideas</Text>
                      </HStack>
                      <Text size="lg" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>{stats.activeIdeas}</Text>
                    </VStack>

                    <VStack space="xs" minWidth="45%">
                      <HStack space="xs" alignItems="center">
                        <Icon as={Calendar} size="xs" color="$secondary500" />
                        <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>Member Since</Text>
                      </HStack>
                      <Text size="sm" fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>
                        {formatMemberSince(stats.memberSince)}
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </GlassCard>
            )}

            {/* Account Section */}
            <VStack space="sm">
              <Heading size="md" color={isDark ? "$white" : "$textLight900"}>Account</Heading>

              {profile?.subscriptionPlan === 'FREE' && (
                <Pressable onPress={() => router.push('/(app)/upgrade')}>
                  <GlassCard p="$4" opacity={0.08}>
                    <HStack space="md" alignItems="center" justifyContent="space-between">
                      <HStack space="md" alignItems="center" flex={1}>
                        <Icon as={Crown} size="md" color="$secondary500" />
                        <VStack flex={1}>
                          <Text fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>Upgrade to Pro</Text>
                          <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>
                            Get unlimited ideas and AI replies
                          </Text>
                        </VStack>
                      </HStack>
                      <Icon as={ChevronRight} size="md" color={isDark ? "$textDark400" : "$textLight400"} />
                    </HStack>
                  </GlassCard>
                </Pressable>
              )}

              <Pressable onPress={() => setShowChangePassword(true)}>
                <GlassCard p="$4" opacity={0.08}>
                  <HStack space="md" alignItems="center" justifyContent="space-between">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Icon as={Lock} size="md" color={isDark ? "$textDark300" : "$textLight500"} />
                      <Text fontWeight="$medium" color={isDark ? "$white" : "$textLight900"}>Change Password</Text>
                    </HStack>
                    <Icon as={ChevronRight} size="md" color={isDark ? "$textDark400" : "$textLight400"} />
                  </HStack>
                </GlassCard>
              </Pressable>

              <Pressable>
                <GlassCard p="$4" opacity={0.08}>
                  <HStack space="md" alignItems="center" justifyContent="space-between">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Icon as={Receipt} size="md" color={isDark ? "$textDark300" : "$textLight500"} />
                      <Text fontWeight="$medium" color={isDark ? "$white" : "$textLight900"}>Billing History</Text>
                    </HStack>
                    <Icon as={ChevronRight} size="md" color={isDark ? "$textDark400" : "$textLight400"} />
                  </HStack>
                </GlassCard>
              </Pressable>
            </VStack>

            {/* Preferences Section */}
            <VStack space="sm">
              <Heading size="md" color={isDark ? "$white" : "$textLight900"}>Preferences</Heading>

              <GlassCard p="$4" opacity={0.08}>
                <VStack>
                  <HStack space="md" alignItems="center" justifyContent="space-between" pb="$4">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Icon as={Moon} size="md" color={isDark ? "$textDark300" : "$textLight500"} />
                      <Text fontWeight="$medium" color={isDark ? "$white" : "$textLight900"}>Dark Mode</Text>
                    </HStack>
                    <Switch
                      value={isDarkMode}
                      onToggle={handleDarkModeToggle}
                    />
                  </HStack>

                  <Divider bg={isDark ? "rgba(255,255,255,0.1)" : "$borderLight200"} />

                  <HStack space="md" alignItems="center" justifyContent="space-between" py="$4">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Icon as={Bell} size="md" color={isDark ? "$textDark300" : "$textLight500"} />
                      <VStack flex={1}>
                        <Text fontWeight="$medium" color={isDark ? "$white" : "$textLight900"}>Push Notifications</Text>
                        <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>
                          Get notified when AI responds
                        </Text>
                      </VStack>
                    </HStack>
                    <Switch
                      value={notifications}
                      onToggle={handleNotificationToggle}
                    />
                  </HStack>

                  <Divider bg={isDark ? "rgba(255,255,255,0.1)" : "$borderLight200"} />

                  <HStack space="md" alignItems="center" justifyContent="space-between" pt="$4">
                    <HStack space="md" alignItems="center" flex={1}>
                      <Icon as={Mail} size="md" color={isDark ? "$textDark300" : "$textLight500"} />
                      <VStack flex={1}>
                        <Text fontWeight="$medium" color={isDark ? "$white" : "$textLight900"}>Marketing Emails</Text>
                        <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>
                          Receive tips and updates
                        </Text>
                      </VStack>
                    </HStack>
                    <Switch
                      value={marketingEmails}
                      onToggle={handleMarketingToggle}
                    />
                  </HStack>
                </VStack>
              </GlassCard>
            </VStack>

            {/* Support Section */}
            <VStack space="sm">
              <Heading size="md" color={isDark ? "$white" : "$textLight900"}>Support</Heading>

              <GlassCard p="$0" opacity={0.08}>
                <Accordion type="single" variant="unfilled">
              <AccordionItem value="faq">
                <AccordionHeader>
                    <AccordionTrigger>
                      <HStack space="md" alignItems="center" flex={1} p="$4">
                        <Icon as={HelpCircle} size="md" color={isDark ? "$textDark300" : "$textLight500"} />
                        <AccordionTitleText color={isDark ? "$white" : "$textLight900"}>Frequently Asked Questions</AccordionTitleText>
                      </HStack>
                      <AccordionIcon as={ChevronDown} color={isDark ? "$textDark400" : "$textLight500"} />
                    </AccordionTrigger>
                  </AccordionHeader>
                  <AccordionContent>
                    <VStack space="md" p="$4">
                      <VStack space="xs">
                        <Text fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>How do I upgrade my plan?</Text>
                        <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>
                          Tap the Upgrade to Pro button to see available plans and complete your purchase.
                        </Text>
                      </VStack>
                      <VStack space="xs">
                        <Text fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>Can I cancel anytime?</Text>
                        <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>
                          Yes, you can cancel your subscription at any time through your device's app store settings.
                        </Text>
                      </VStack>
                      <VStack space="xs">
                        <Text fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>How do I reset my password?</Text>
                        <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>
                          Use the Change Password option above or request a reset link from the login screen.
                        </Text>
                      </VStack>
                    </VStack>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contact">
                  <AccordionHeader>
                    <AccordionTrigger>
                      <HStack space="md" alignItems="center" flex={1} p="$4">
                        <Icon as={Phone} size="md" color={isDark ? "$textDark300" : "$textLight500"} />
                        <AccordionTitleText color={isDark ? "$white" : "$textLight900"}>Contact Support</AccordionTitleText>
                      </HStack>
                      <AccordionIcon as={ChevronDown} color={isDark ? "$textDark400" : "$textLight500"} />
                    </AccordionTrigger>
                  </AccordionHeader>
                  <AccordionContent>
                    <VStack space="md" p="$4">
                      <Pressable onPress={() => Linking.openURL('mailto:support@ideaspark.app')}>
                        <HStack space="md" alignItems="center">
                          <Icon as={Mail} size="sm" color="$primary500" />
                          <Text color="$primary600">support@ideaspark.app</Text>
                        </HStack>
                      </Pressable>
                      <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>
                        We typically respond within 24 hours during business days.
                      </Text>
                    </VStack>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </GlassCard>
          </VStack>

            {/* Platform Test Button (Dev Only) */}
            {__DEV__ && (
              <Button
                variant="solid"
                bg="$purple500"
                onPress={() => router.push('/(app)/platform-test')}
              >
                <ButtonIcon as={Smartphone} mr="$2" />
                <ButtonText>Run Platform Tests</ButtonText>
              </Button>
            )}

            {/* Danger Zone */}
            <VStack space="sm" pb="$8">
              <Button
                variant="solid"
                action="negative"
                onPress={() => {
                  logger.logUserAction('logout');
                  signOut();
                }}
              >
                <ButtonIcon as={LogOut} mr="$2" />
                <ButtonText>Log Out</ButtonText>
              </Button>

              <Pressable onPress={() => setShowDeleteAccount(true)}>
                <GlassCard p="$4" opacity={0.08}>
                  <HStack space="md" alignItems="center" justifyContent="center">
                    <Icon as={Trash2} size="md" color="$error500" />
                    <Text color="$error600" fontWeight="$medium">Delete Account</Text>
                  </HStack>
                </GlassCard>
              </Pressable>
            </VStack>
          </VStack>
        </ScrollView>
      </GradientBackground>
    </Box>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Edit Profile</Heading>
            <ModalCloseButton>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>Name</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="lg">
                  <InputField
                    placeholder="Enter your name"
                    value={editFormData.name}
                    onChangeText={(text) => setEditFormData({ ...editFormData, name: text })}
                  />
                </Input>
              </FormControl>

              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>Email</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="lg">
                  <InputSlot pl="$3">
                    <InputIcon as={Mail} />
                  </InputSlot>
                  <InputField
                    placeholder="Enter your email"
                    value={editFormData.email}
                    onChangeText={(text) => setEditFormData({ ...editFormData, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </Input>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="md">
              <Button
                variant="outline"
                action="secondary"
                onPress={() => setShowEditProfile(false)}
                flex={1}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="primary"
                onPress={handleUpdateProfile}
                isDisabled={updateProfile.isPending}
                flex={1}
              >
                {updateProfile.isPending ? (
                  <Spinner color="$white" />
                ) : (
                  <ButtonText>Save Changes</ButtonText>
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
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Change Password</Heading>
            <ModalCloseButton>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>Current Password</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="lg">
                  <InputField
                    placeholder="Enter current password"
                    value={passwordFormData.currentPassword}
                    onChangeText={(text) => setPasswordFormData({ ...passwordFormData, currentPassword: text })}
                    secureTextEntry={!showPasswordCurrent}
                  />
                  <InputSlot pr="$3" onPress={() => setShowPasswordCurrent(!showPasswordCurrent)}>
                    <InputIcon as={showPasswordCurrent ? Eye : EyeOff} />
                  </InputSlot>
                </Input>
              </FormControl>

              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>New Password</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="lg">
                  <InputField
                    placeholder="Enter new password"
                    value={passwordFormData.newPassword}
                    onChangeText={(text) => setPasswordFormData({ ...passwordFormData, newPassword: text })}
                    secureTextEntry={!showPasswordNew}
                  />
                  <InputSlot pr="$3" onPress={() => setShowPasswordNew(!showPasswordNew)}>
                    <InputIcon as={showPasswordNew ? Eye : EyeOff} />
                  </InputSlot>
                </Input>
              </FormControl>

              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>Confirm New Password</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="lg">
                  <InputField
                    placeholder="Confirm new password"
                    value={passwordFormData.confirmPassword}
                    onChangeText={(text) => setPasswordFormData({ ...passwordFormData, confirmPassword: text })}
                    secureTextEntry={!showPasswordNew}
                  />
                </Input>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="md">
              <Button
                variant="outline"
                action="secondary"
                onPress={() => setShowChangePassword(false)}
                flex={1}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="primary"
                onPress={handleChangePassword}
                isDisabled={changePassword.isPending}
                flex={1}
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
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Delete Account</Heading>
            <ModalCloseButton>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <Alert action="error" variant="accent">
                <AlertIcon as={AlertTriangle} mr="$3" />
                <VStack flex={1}>
                  <AlertText fontWeight="$semibold">This action cannot be undone!</AlertText>
                  <AlertText size="sm">
                    All your ideas, messages, and subscription will be permanently deleted.
                  </AlertText>
                </VStack>
              </Alert>

              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>Enter your password to confirm</FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="lg">
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
          <ModalFooter>
            <HStack space="md">
              <Button
                variant="outline"
                action="secondary"
                onPress={() => {
                  setShowDeleteAccount(false);
                  setDeletePassword('');
                }}
                flex={1}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="negative"
                onPress={handleDeleteAccount}
                isDisabled={deleteAccount.isPending || !deletePassword}
                flex={1}
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