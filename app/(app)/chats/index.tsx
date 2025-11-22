import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  BadgeText,
  Pressable,
  Icon,
  Center,
  Spinner,
} from "@gluestack-ui/themed";
import {
  MessageCircle,
  Lightbulb,
  ChevronRight,
  Sparkles,
  Plus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from '@/contexts/ThemeContext';
import { useIdeas } from '@/hooks/useApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, AnimatedOrb } from '@/components/ui';

// Map category to emoji
const CATEGORY_EMOJI: Record<string, string> = {
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
  const { colorMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: ideas, isLoading, refetch, isRefetching } = useIdeas();

  const isDark = colorMode === 'dark';

  const handleIdeaPress = (ideaId: string) => {
    router.push(`/(app)/chats/${ideaId}`);
  };

  const handleCreateNew = () => {
    router.push('/(app)/index');
  };

  if (isLoading) {
    return (
      <Box flex={1}>
        <GradientBackground>
          <Center flex={1}>
            <AnimatedOrb size={80} icon="sparkles" />
            <Text mt="$6" color={isDark ? "$white" : "$textLight500"} size="lg">
              Loading conversations...
            </Text>
          </Center>
        </GradientBackground>
      </Box>
    );
  }

  const sortedIdeas = ideas?.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ) || [];

  return (
    <Box flex={1}>
      <GradientBackground>
        {/* Header */}
        <Box pt={insets.top + 20} pb="$6" px="$4">
          <HStack justifyContent="space-between" alignItems="center">
            <HStack space="sm" alignItems="center">
              <AnimatedOrb size={50} icon="sparkles" />
              <Heading size="2xl" color={isDark ? "$white" : "$textLight900"}>
                Conversations
              </Heading>
            </HStack>
            {user?.subscriptionPlan === 'PRO' && (
              <Badge action="success" variant="solid" size="sm">
                <BadgeText>Pro</BadgeText>
              </Badge>
            )}
          </HStack>
        </Box>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <VStack space="md" px="$4" pb="$6">
            {/* Empty State */}
            {sortedIdeas.length === 0 && (
              <Center py="$20">
                <AnimatedOrb size={100} icon="lightbulb" />
                <Heading size="xl" color={isDark ? "$white" : "$textLight900"} mb="$3" mt="$6" textAlign="center">
                  No Conversations Yet
                </Heading>
                <Text size="md" color={isDark ? "$textDark400" : "$textLight500"} textAlign="center" mb="$8" px="$6">
                  Start your first idea refinement session to begin chatting with AI
                </Text>
                <Pressable
                  onPress={handleCreateNew}
                  accessibilityRole="button"
                  accessibilityLabel="Create your first idea"
                >
                  <GlassCard px="$6" py="$4">
                    <HStack space="sm" alignItems="center">
                      <Icon as={Plus} size="md" color="$primary500" />
                      <Text color={isDark ? "$white" : "$primary600"} fontWeight="$bold" size="lg">
                        Create Your First Idea
                      </Text>
                    </HStack>
                  </GlassCard>
                </Pressable>
              </Center>
            )}

            {/* Conversation List */}
            {sortedIdeas.map((idea) => {
              const categoryEmoji = CATEGORY_EMOJI[idea.category] || '💡';
              const messageCount = idea.messageCount || 0;
              const lastUpdated = new Date(idea.updatedAt);
              const now = new Date();
              const diffMs = now.getTime() - lastUpdated.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);

              let timeAgo = '';
              if (diffMins < 1) timeAgo = 'Just now';
              else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
              else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
              else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
              else timeAgo = lastUpdated.toLocaleDateString();

              return (
                <Pressable
                  key={idea.id}
                  onPress={() => handleIdeaPress(idea.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat for ${idea.title}`}
                  accessibilityHint="Double tap to open conversation"
                >
                  <GlassCard p="$4">
                    <HStack
                      space="md"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <HStack space="md" flex={1} alignItems="center">
                        {/* Category Icon */}
                        <Box
                          bg="$primary100"
                          p="$3"
                          borderRadius="$full"
                          alignItems="center"
                          justifyContent="center"
                          minWidth="$12"
                          minHeight="$12"
                        >
                          <Text fontSize="$xl">{categoryEmoji}</Text>
                        </Box>

                        {/* Idea Details */}
                        <VStack flex={1} space="xs">
                          <Text
                            fontWeight="$bold"
                            color={isDark ? "$white" : "$textLight900"}
                            size="md"
                            numberOfLines={1}
                          >
                            {idea.title}
                          </Text>
                          <Text
                            size="sm"
                            color={isDark ? "$textDark400" : "$textLight500"}
                            numberOfLines={2}
                          >
                            {idea.description}
                          </Text>
                          <HStack space="sm" alignItems="center" mt="$1">
                            <Badge
                              action="secondary"
                              variant="outline"
                              size="sm"
                            >
                              <BadgeText>{messageCount} messages</BadgeText>
                            </Badge>
                            <Text size="xs" color={isDark ? "$textDark500" : "$textLight400"}>
                              {timeAgo}
                            </Text>
                          </HStack>
                        </VStack>
                      </HStack>

                      {/* Chevron */}
                      <Icon as={ChevronRight} size="lg" color={isDark ? "$textDark400" : "$textLight400"} />
                    </HStack>
                  </GlassCard>
                </Pressable>
              );
            })}

            {/* Create New Idea CTA at bottom */}
            {sortedIdeas.length > 0 && (
              <Pressable
                onPress={handleCreateNew}
                mt="$4"
                accessibilityRole="button"
                accessibilityLabel="Create new idea"
                accessibilityHint="Double tap to start a new idea session"
              >
                <GlassCard p="$4" bg={isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)"}>
                  <HStack
                    space="md"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={Plus} size="md" color="$primary500" />
                    <Text
                      fontWeight="$bold"
                      color="$primary500"
                      size="md"
                    >
                      Start a New Idea Session
                    </Text>
                  </HStack>
                </GlassCard>
              </Pressable>
            )}
          </VStack>
        </ScrollView>
      </GradientBackground>
    </Box>
  );
}
