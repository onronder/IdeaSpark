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
  Card,
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
import { EmptyState } from '@/components/ui';

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
      <Box flex={1} bg={isDark ? "$backgroundDark950" : "$backgroundLight50"}>
        <Center flex={1}>
          <Spinner size="large" color="$primary500" />
          <Text mt="$6" color={isDark ? "$textDark300" : "$textLight700"} size="lg">
            Loading conversations...
          </Text>
        </Center>
      </Box>
    );
  }

  const sortedIdeas = ideas?.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ) || [];

  return (
    <Box flex={1} bg={isDark ? "$backgroundDark950" : "$backgroundLight50"}>
      {/* Header */}
      <Box pt={insets.top + 20} pb="$6" px="$4">
        <HStack justifyContent="space-between" alignItems="center">
          <Heading size="2xl" color={isDark ? "$textDark50" : "$textLight900"}>
            Conversations
          </Heading>
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
            <Box py="$20">
              <EmptyState
                icon={<Icon as={Lightbulb} size="xl" color={isDark ? "$textDark300" : "$textLight600"} />}
                title="No conversations yet"
                description="Start your first idea refinement session to begin chatting with AI"
                action={{
                  label: "Create Your First Idea",
                  onPress: handleCreateNew,
                }}
              />
            </Box>
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
                <Card
                  p="$4"
                  variant="elevated"
                  bg={isDark ? "$backgroundDark900" : "$backgroundLight0"}
                  borderColor={isDark ? "$borderDark700" : "$borderLight200"}
                >
                  <HStack
                    space="md"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <HStack space="md" flex={1} alignItems="center">
                      {/* Category Emoji (no circular background) */}
                      <Text fontSize="$2xl">{categoryEmoji}</Text>

                      {/* Idea Details */}
                      <VStack flex={1} space="xs">
                        <Text
                          fontWeight="$bold"
                          color={isDark ? "$textDark50" : "$textLight900"}
                          size="md"
                          numberOfLines={1}
                        >
                          {idea.title}
                        </Text>
                        <Text
                          size="sm"
                          color={isDark ? "$textDark300" : "$textLight700"}
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
                </Card>
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
              <Card
                p="$4"
                variant="elevated"
                bg={isDark ? "$backgroundDark900" : "$backgroundLight0"}
                borderColor="$primary500"
                borderWidth={1}
              >
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
              </Card>
            </Pressable>
          )}
        </VStack>
      </ScrollView>
    </Box>
  );
}
