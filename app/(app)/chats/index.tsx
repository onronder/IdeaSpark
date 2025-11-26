import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  Spinner,
} from "@gluestack-ui/themed";
import {
  MessageCircle,
  Lightbulb,
  Clock,
  Plus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useIdeas } from '@/hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HeaderGradient,
  ListItem,
  EmptyStateNew,
  SectionCard,
  PrimaryButton,
} from '@/components/ui';
import { space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';

// Map category to emoji
const CATEGORY_EMOJIS: Record<string, string> = {
  BUSINESS: '💼',
  TECHNOLOGY: '💻',
  HEALTH: '🏥',
  EDUCATION: '📚',
  ENTERTAINMENT: '🎮',
  OTHER: '🔮',
};

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: ideas, isLoading, refetch, isRefetching } = useIdeas();
  const queryClient = useQueryClient();
  const { colors } = useThemedColors();

  const handleIdeaPress = (ideaId: string) => {
    // Prefetch messages so the chat opens faster
    queryClient.prefetchQuery({
      queryKey: ['messages', ideaId],
      queryFn: async () => {
        const response = await apiClient.get(`/ideas/${ideaId}/messages`);
        return response.data || [];
      },
    });

    router.push(`/(app)/chats/${ideaId}`);
  };

  const handleCreateNew = () => {
    router.push('/(app)');
  };

  const formatTimeAgo = (updatedAt: string) => {
    const lastUpdated = new Date(updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastUpdated.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Box flex={1} bg={colors.surfaceMuted} justifyContent="center" alignItems="center">
        <Spinner size="large" color={colors.brand[600]} />
        <Text mt={space.lg} color={colors.textPrimary} fontSize="$lg" fontWeight="$medium">
          Loading conversations...
        </Text>
      </Box>
    );
  }

  const sortedIdeas = ideas?.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ) || [];

  return (
    <Box flex={1} bg={colors.surfaceMuted}>
      <HeaderGradient
        greeting="Your Ideas"
        name="💬"
        usageText={
          sortedIdeas.length === 0
            ? 'Start your first idea refinement session'
            : `${sortedIdeas.length} active idea${sortedIdeas.length !== 1 ? 's' : ''}`
        }
        showUpgradeButton={user?.subscriptionPlan !== 'PRO'}
        onUpgrade={() =>
          router.push({
            pathname: '/(app)/upgrade',
            params: { source: 'chats_list_header' },
          })
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <VStack space="md" px={space.lg} py={space.lg}>
          {/* Empty State */}
          {sortedIdeas.length === 0 && (
            <EmptyStateNew
              icon={Lightbulb}
              title="No Conversations Yet"
              description="Start your first idea refinement session to begin chatting with AI"
              action={{
                label: "Create Your First Idea",
                onPress: handleCreateNew
              }}
            />
          )}

          {/* Conversation List */}
          {sortedIdeas.map((idea) => {
            const categoryEmoji = CATEGORY_EMOJIS[idea.category] || '💡';
            const messageCount = idea.messageCount || 0;
            const timeAgo = formatTimeAgo(idea.updatedAt);

            return (
              <SectionCard key={idea.id} noPadding>
                <Pressable
                  onPress={() => handleIdeaPress(idea.id)}
                  p={space.md}
                >
                  <HStack space="md" alignItems="center">
                    {/* Category Icon */}
                    <Box
                      bg={colors.brand[50]}
                      p={space.sm}
                      borderRadius={12}
                      minWidth={48}
                      minHeight={48}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize="$2xl">{categoryEmoji}</Text>
                    </Box>

                    {/* Idea Details */}
                    <VStack flex={1} space="xs">
                      <Text
                        fontWeight="$bold"
                        color={colors.textPrimary}
                        fontSize="$md"
                        numberOfLines={1}
                      >
                        {idea.title}
                      </Text>
                      <Text
                        fontSize="$sm"
                        color={colors.textSecondary}
                        numberOfLines={2}
                      >
                        {idea.description}
                      </Text>
                      <HStack space="md" alignItems="center" mt={space.xxs}>
                        <HStack space="xs" alignItems="center">
                          <MessageCircle color={colors.textSecondary} size={14} />
                          <Text fontSize="$xs" color={colors.textSecondary}>
                            {messageCount} message{messageCount !== 1 ? 's' : ''}
                          </Text>
                        </HStack>
                        <HStack space="xs" alignItems="center">
                          <Clock color={colors.textSecondary} size={14} />
                          <Text fontSize="$xs" color={colors.textSecondary}>
                            {timeAgo}
                          </Text>
                        </HStack>
                      </HStack>
                    </VStack>
                  </HStack>
                </Pressable>
              </SectionCard>
            );
          })}

          {/* Create New Idea CTA at bottom */}
          {sortedIdeas.length > 0 && (
            <SectionCard>
              <Pressable onPress={handleCreateNew}>
                <HStack space="md" alignItems="center" justifyContent="center" py={space.sm}>
                  <Box
                    bg={colors.brand[600]}
                    p={space.xs}
                    borderRadius={20}
                  >
                    <Plus color="#FFFFFF" size={20} />
                  </Box>
                  <Text
                    fontWeight="$bold"
                    color={colors.brand[600]}
                    fontSize="$md"
                  >
                    Start a New Idea Session
                  </Text>
                </HStack>
              </Pressable>
            </SectionCard>
          )}
        </VStack>
      </ScrollView>
    </Box>
  );
}
