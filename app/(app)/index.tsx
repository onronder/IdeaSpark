import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  BadgeText,
  BadgeIcon,
  Button,
  ButtonText,
  ButtonIcon,
  Input,
  InputField,
  Textarea,
  TextareaInput,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  Alert,
  AlertIcon,
  AlertText,
  Pressable,
  Spinner,
  Icon,
  Center,
  Card,
} from "@gluestack-ui/themed";
import {
  ArrowRight,
  Lightbulb,
  Sparkles,
  MessageCircle,
  Crown,
  AlertCircle,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from '@/contexts/ThemeContext';
import { useCreateIdea, useUsageSummary } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '@/components/ui';

// Categories to choose from
const CATEGORIES = [
  { value: 'BUSINESS', label: 'Business', icon: '💼' },
  { value: 'TECHNOLOGY', label: 'Technology', icon: '💻' },
  { value: 'HEALTH', label: 'Health', icon: '🏥' },
  { value: 'EDUCATION', label: 'Education', icon: '📚' },
  { value: 'ENTERTAINMENT', label: 'Entertainment', icon: '🎮' },
  { value: 'OTHER', label: 'Other', icon: '🔮' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorMode } = useTheme();
  const createIdea = useCreateIdea();
  const { data: usage, refetch: refetchUsage, isRefetching } = useUsageSummary();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('HomeScreen');
  const insets = useSafeAreaInsets();

  const isDark = colorMode === 'dark';

  const [formData, setFormData] = useState({
    description: '',
    category: 'BUSINESS' as any,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    refetchUsage();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Please describe your idea';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Please provide more detail about your idea (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setErrors({});
    logger.logUserAction('create_idea_attempt', { category: formData.category });

    try {
      const description = formData.description.trim();
      const firstLine = description.split(/\n/)[0].trim();
      const generatedTitleBase = firstLine || description;
      const generatedTitle =
        generatedTitleBase.length <= 60
          ? generatedTitleBase
          : `${generatedTitleBase.slice(0, 57)}…`;

      const result = await createIdea.mutateAsync({
        title: generatedTitle || 'Untitled idea',
        description,
        category: formData.category,
      });

      if (result) {
        toast.success('Idea created!', 'Start chatting to refine it');
        router.push(`/(app)/chats/${result.id}`);
        // Clear form
        setFormData({ description: '', category: 'BUSINESS' });
      }
    } catch (err: any) {
      if (err.message?.includes('quota')) {
        toast.showToast({
          type: 'warning',
          title: 'Quota Exceeded',
          message: "You've reached your free plan limit. Upgrade to Pro for unlimited ideas!",
          action: {
            label: 'Upgrade Now',
            onPress: () => router.push('/(app)/upgrade'),
          },
          duration: 7000,
        });
      } else {
        handleError(err, err.message);
        setErrors({ general: err.message || 'Failed to create idea. Please try again.' });
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Box flex={1} bg={isDark ? "$backgroundDark950" : "$backgroundLight50"}>
      <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetchUsage} />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header */}
        <Box
          pt={insets.top + 20}
          pb="$6"
          px="$4"
          w="100%"
          maxWidth={480}
          alignSelf="center"
        >
            <HStack justifyContent="space-between" alignItems="center" mb="$5">
              <VStack flex={1}>
                <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>
                  {getGreeting()},
                </Text>
                <Heading size="2xl" color={isDark ? "$textDark50" : "$textLight900"}>
                  {user?.name || 'Innovator'}
                </Heading>
              </VStack>

              <HStack space="sm" alignItems="center" justifyContent="flex-end">
                {user?.subscriptionPlan === 'PRO' ? (
                  <Pressable
                    onPress={() => router.push('/(app)/profile')}
                    accessibilityRole="button"
                    accessibilityLabel="Pro member - Go to profile"
                  >
                    <Badge action="success" variant="subtle" size="md">
                      <BadgeIcon as={Crown} mr="$1" />
                      <BadgeText>Pro</BadgeText>
                    </Badge>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => router.push('/(app)/upgrade')}
                    accessibilityRole="button"
                    accessibilityLabel="Upgrade to Pro"
                  >
                    <Badge action="primary" variant="outline" size="md">
                      <BadgeText>Upgrade</BadgeText>
                    </Badge>
                  </Pressable>
                )}
              </HStack>
            </HStack>

            {/* Usage Overview (subtle, below header) */}
            {usage && (
              <Text size="xs" color={isDark ? "$textDark500" : "$textLight400"}>
                {user?.subscriptionPlan === 'FREE'
                  ? `${
                      usage.remainingSessions ?? 'Unlimited'
                    } ideas left · ${
                      usage.remainingMessages ?? 'Unlimited'
                    } replies per idea`
                  : 'Pro plan · unlimited ideas & replies'}
              </Text>
            )}
        </Box>

        <VStack
          space="lg"
          px="$4"
          pb="$6"
          w="100%"
          maxWidth={480}
          alignSelf="center"
        >
            {/* Idea Creation Card */}
            <Card
              p="$6"
              variant="elevated"
              bg={isDark ? "$backgroundDark900" : "$backgroundLight0"}
              borderColor={isDark ? "$borderDark700" : "$borderLight200"}
            >
              <VStack space="md">
                <Center mb="$2">
                  <Heading size="xl" textAlign="center" color={isDark ? "$textDark50" : "$textLight900"}>
                    Describe your idea
                  </Heading>
                  <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"} textAlign="center" mt="$2">
                    Tell IdeaSpark what you&apos;re working on and we&apos;ll help you refine it.
                  </Text>
                </Center>

                {errors.general && (
                  <Alert action="error" variant="solid">
                    <AlertIcon as={AlertCircle} mr="$3" />
                    <AlertText>{errors.general}</AlertText>
                  </Alert>
                )}

                {/* Category Selection */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText color={isDark ? "$textDark300" : "$textLight800"}>
                      Category
                    </FormControlLabelText>
                  </FormControlLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <HStack space="sm">
                      {CATEGORIES.map((cat) => {
                        const isSelected = formData.category === cat.value;
                        return (
                          <Pressable
                            key={cat.value}
                            onPress={() => setFormData({ ...formData, category: cat.value })}
                            disabled={createIdea.isPending}
                          >
                            <Box
                              px="$3.5"
                              py="$2"
                              borderRadius="$full"
                              borderWidth={1}
                              borderColor={
                                isSelected
                                  ? "$primary500"
                                  : isDark
                                    ? "$borderDark700"
                                    : "$borderLight200"
                              }
                              bg={
                                isSelected
                                  ? "$primary50"
                                  : "transparent"
                              }
                            >
                              <HStack space="xs" alignItems="center">
                                <Text size="sm">{cat.icon}</Text>
                                <Text
                                  size="sm"
                                  fontWeight={isSelected ? "$semibold" : "$medium"}
                                  color={isDark ? "$textDark300" : "$textLight700"}
                                >
                                  {cat.label}
                                </Text>
                              </HStack>
                            </Box>
                          </Pressable>
                        );
                      })}
                    </HStack>
                  </ScrollView>
                </FormControl>

                {/* Description Textarea */}
                <FormControl isInvalid={!!errors.description}>
                  <Textarea
                    h="$32"
                    size="lg"
                    isDisabled={createIdea.isPending}
                    isInvalid={!!errors.description}
                    bg={isDark ? "$backgroundDark800" : "$backgroundLight0"}
                    borderRadius="$xl"
                    borderWidth={1}
                    borderColor={isDark ? "$borderDark700" : "$borderLight200"}
                  >
                    <TextareaInput
                      placeholder="Describe your idea… What are you trying to build or explore?"
                      value={formData.description}
                      onChangeText={(text) => handleInputChange('description', text)}
                      placeholderTextColor={isDark ? "$textDark500" : "$textLight400"}
                    />
                  </Textarea>
                  {errors.description && (
                    <FormControlError>
                      <FormControlErrorText>{errors.description}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <Button
                  size="lg"
                  variant="solid"
                  action="primary"
                  isDisabled={!formData.description.trim() || createIdea.isPending}
                  onPress={handleSubmit}
                  accessibilityRole="button"
                  accessibilityLabel="Refine my idea with AI"
                >
                  {createIdea.isPending ? (
                    <Spinner color="$white" />
                  ) : (
                    <HStack space="sm" alignItems="center">
                      <ButtonIcon as={Sparkles} />
                      <ButtonText>Refine My Idea with AI</ButtonText>
                      <ButtonIcon as={ArrowRight} />
                    </HStack>
                  )}
                </Button>
              </VStack>
            </Card>

            {/* Benefits */}
            <VStack space="md">
              <Heading size="lg" color={isDark ? "$textDark50" : "$textLight900"}>
                What you can do here
              </Heading>

              <Card
                p="$4"
                variant="elevated"
                bg={isDark ? "$backgroundDark900" : "$backgroundLight0"}
                borderColor={isDark ? "$borderDark700" : "$borderLight200"}
              >
                <HStack space="md" alignItems="flex-start">
                  <Box
                    bg="$info100"
                    p="$3"
                    borderRadius="$full"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={MessageCircle} size="md" color="$info600" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$semibold" color={isDark ? "$textDark50" : "$textLight900"}>
                      Talk through your ideas
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark300" : "$textLight700"}>
                      Use a structured chat to explore, stress‑test, and polish each concept.
                    </Text>
                  </VStack>
                </HStack>
              </Card>

              <Card
                p="$4"
                variant="elevated"
                bg={isDark ? "$backgroundDark900" : "$backgroundLight0"}
                borderColor={isDark ? "$borderDark700" : "$borderLight200"}
              >
                <HStack space="md" alignItems="flex-start">
                  <Box
                    bg="$success100"
                    p="$3"
                    borderRadius="$full"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={Lightbulb} size="md" color="$success600" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$semibold" color={isDark ? "$textDark50" : "$textLight900"}>
                      Get sharper opportunities
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark300" : "$textLight700"}>
                      Turn rough thoughts into clear problem statements, user stories, and next steps.
                    </Text>
                  </VStack>
                </HStack>
              </Card>
            </VStack>
          </VStack>
      </ScrollView>
    </Box>
  );
}
