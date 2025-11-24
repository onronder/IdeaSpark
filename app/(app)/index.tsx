import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Spinner,
} from "@gluestack-ui/themed";
import {
  Lightbulb,
  Sparkles,
  MessageCircle,
  Target,
  Rocket,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useCreateIdea, useUsageSummary } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  HeaderGradient,
  SectionCard,
  FilledInput,
  FilledTextarea,
  SelectableChip,
  FeatureCard,
  UsagePill,
  PrimaryButton,
  InlineNotice,
} from '@/components/ui';
import { colors, space } from '@/theme/tokens';

// Categories with icons
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
  const createIdea = useCreateIdea();
  const { data: usage, refetch: refetchUsage, isRefetching } = useUsageSummary();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('HomeScreen');
  const { isOnline } = useNetworkStatus();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'BUSINESS' as any,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    refetchUsage();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a title for your idea';
    }

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
      const result = await createIdea.mutateAsync({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
      });

      if (result) {
        toast.success('Idea created!', 'Start chatting to refine it');
        router.push(`/(app)/chats/${result.id}`);
        // Clear form
        setFormData({ title: '', description: '', category: 'BUSINESS' });
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
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUsageText = () => {
    if (user?.subscriptionPlan === 'PRO') {
      return 'Pro Member • Unlimited Ideas';
    }
    if (!usage) return '';

    const sessions = usage.remainingSessions ?? 'Unlimited';
    const messages = usage.remainingMessages ?? 'Unlimited';
    return `${sessions} idea${sessions !== 1 && sessions !== 'Unlimited' ? 's' : ''} • ${messages} repl${messages !== 1 && messages !== 'Unlimited' ? 'ies' : 'y'} per session`;
  };

  const isPro = user?.subscriptionPlan === 'PRO';
  const canSubmit = formData.title.trim() && formData.description.trim() && isOnline && !createIdea.isPending;

  return (
    <Box flex={1} bg={colors.surfaceMuted}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetchUsage} />
        }
      >
        {/* Header with Gradient */}
        <HeaderGradient
          greeting={getGreeting()}
          name={user?.name || 'Innovator'}
          usageText={getUsageText()}
          onUpgrade={() => router.push('/(app)/upgrade')}
          showUpgradeButton={!isPro}
        />

        <VStack space="lg" px={space.lg} py={space.lg}>
          {/* Notice Banners */}
          {(!isOnline || (!isPro && usage && usage.remainingSessions !== null && usage.remainingSessions <= 1) || errors.general) && (
            <VStack space="md">
              {/* Offline Banner */}
              {!isOnline && (
                <InlineNotice
                  type="warning"
                  message="You're offline. Connect to the internet to create ideas."
                />
              )}

              {/* Usage Notice for Free Users */}
              {!isPro && usage && usage.remainingSessions !== null && usage.remainingSessions <= 1 && (
                <InlineNotice
                  type="warning"
                  title="Running Low on Ideas"
                  message={`You have ${usage.remainingSessions} idea session${usage.remainingSessions !== 1 ? 's' : ''} left. Upgrade to Pro for unlimited ideas!`}
                  action={{
                    label: 'Upgrade Now',
                    onPress: () => router.push('/(app)/upgrade'),
                  }}
                />
              )}

              {/* General Error */}
              {errors.general && (
                <InlineNotice
                  type="error"
                  message={errors.general}
                  onDismiss={() => setErrors({ ...errors, general: '' })}
                />
              )}
            </VStack>
          )}

          {/* Main Idea Creation Card */}
          <SectionCard>
            <VStack space="lg">
              <VStack space="xs">
                <Text
                  color={colors.textPrimary}
                  fontSize="$2xl"
                  fontWeight="$bold"
                  textAlign="center"
                >
                  Spark Your Next Big Idea
                </Text>
                <Text
                  color={colors.textSecondary}
                  fontSize="$md"
                  textAlign="center"
                >
                  Describe your concept and let AI help you refine it
                </Text>
              </VStack>

              {/* Category Selection */}
              <VStack space="xs">
                <Text
                  color={colors.textPrimary}
                  fontSize="$sm"
                  fontWeight="$medium"
                >
                  Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: space.lg }}
                >
                  <HStack space="xs">
                    {CATEGORIES.map((cat) => (
                      <SelectableChip
                        key={cat.value}
                        label={`${cat.icon} ${cat.label}`}
                        active={formData.category === cat.value}
                        onPress={() => setFormData({ ...formData, category: cat.value })}
                        isDisabled={createIdea.isPending}
                      />
                    ))}
                  </HStack>
                </ScrollView>
              </VStack>

              {/* Title Input */}
              <FilledInput
                label="Idea Title"
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                placeholder="Give your idea a catchy title..."
                error={errors.title}
                isRequired
                isDisabled={createIdea.isPending}
              />

              {/* Description Textarea */}
              <FilledTextarea
                label="Description"
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Describe your idea in detail... What problem does it solve? Who is it for? What makes it unique?"
                error={errors.description}
                isRequired
                isDisabled={createIdea.isPending}
                maxLength={1000}
                numberOfLines={6}
              />

              {/* Submit Button */}
              <PrimaryButton
                onPress={handleSubmit}
                isDisabled={!canSubmit}
                isLoading={createIdea.isPending}
              >
                {createIdea.isPending ? 'Creating...' : 'Refine My Idea with AI ✨'}
              </PrimaryButton>
            </VStack>
          </SectionCard>

          {/* Feature Cards */}
          <VStack space="md">
            <Text
              color={colors.textPrimary}
              fontSize="$xl"
              fontWeight="$semibold"
            >
              How IdeaSpark Helps You
            </Text>

            <FeatureCard
              icon={MessageCircle}
              title="Interactive AI Chat"
              description="Have a conversation with AI to explore and refine your ideas"
            />

            <FeatureCard
              icon={Target}
              title="Smart Suggestions"
              description="Get personalized recommendations based on your idea category"
            />

            <FeatureCard
              icon={Rocket}
              title="Unlimited with Pro"
              description="Upgrade to Pro for unlimited ideas and AI conversations"
              onPress={() => router.push('/(app)/upgrade')}
            />
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}
