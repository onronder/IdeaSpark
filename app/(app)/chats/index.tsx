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
  Crown,
  Clock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from '@/contexts/ThemeContext';
import { useIdeas } from '@/hooks/useApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, AnimatedOrb } from '@/components/ui';

// Map category to emoji and color
const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  BUSINESS: { emoji: '💼', color: '#8B5CF6' },
  TECHNOLOGY: { emoji: '💻', color: '#3B82F6' },
  HEALTH: { emoji: '🏥', color: '#10B981' },
  EDUCATION: { emoji: '📚', color: '#F59E0B' },
  ENTERTAINMENT: { emoji: '🎮', color: '#EC4899' },
  OTHER: { emoji: '🔮', color: '#6366F1' },
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
            <AnimatedOrb size={100} icon="sparkles" />
            <Text mt="$8" color={isDark ? "$white" : "$textLight500"} size="xl" fontWeight="$semibold">
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
        {/* Enhanced Header */}
        <Box pt={insets.top + 24} pb="$8" px="$5">
          <HStack justifyContent="space-between" alignItems="center" mb="$4">
            <HStack space="md" alignItems="center">
              <AnimatedOrb size={60} icon="sparkles" />
              <Heading size="3xl" color={isDark ? "$white" : "$textLight900"} lineHeight="$3xl">
                Conversations
              </Heading>
            </HStack>
            {user?.subscriptionPlan === 'PRO' && (
              <Box
                bg="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                px="$3"
                py="$1.5"
                borderRadius="$full"
                shadowColor="$success600"
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={0.3}
                shadowRadius={8}
              >
                <HStack space="xs" alignItems="center">
                  <Icon as={Crown} size="xs" color="$white" />
                  <Text color="$white" fontWeight="$bold" fontSize="$xs">Pro</Text>
                </HStack>
              </Box>
            )}
          </HStack>

          <Text size="md" color={isDark ? "$textDark300" : "$textLight600"} lineHeight="$md">
            {sortedIdeas.length === 0 
              ? "Start your first idea refinement session"
              : `${sortedIdeas.length} active idea${sortedIdeas.length !== 1 ? 's' : ''}`
            }
          </Text>
        </Box>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <VStack space="lg" px="$5" pb="$8">
            {/* Empty State */}
            {sortedIdeas.length === 0 && (
              <Center py="$16">
                <Box mb="$8">
                  <AnimatedOrb size={120} icon="lightbulb" />
                </Box>
                <Heading size="2xl" color={isDark ? "$white" : "$textLight900"} mb="$4" textAlign="center" lineHeight="$2xl">
                  No Conversations Yet
                </Heading>
                <Text size="lg" color={isDark ? "$textDark300" : "$textLight600"} textAlign="center" mb="$10" px="$8" lineHeight="$lg">
                  Start your first idea refinement session to begin chatting with AI
                </Text>
                <Pressable
                  onPress={handleCreateNew}
                  accessibilityRole="button"
                  accessibilityLabel="Create your first idea"
                >
                  <Box
                    bg="$primary600"
                    px="$8"
                    py="$4"
                    borderRadius="$2xl"
                    shadowColor="$primary600"
                    shadowOffset={{ width: 0, height: 8 }}
                    shadowOpacity={0.4}
                    shadowRadius={16}
                    sx={{
                      ':active': {
                        transform: [{ scale: 0.98 }]
                      }
                    }}
                  >
                    <HStack space="sm" alignItems="center">
                      <Icon as={Plus} size="lg" color="$white" />
                      <Text color="$white" fontWeight="$bold" size="lg">
                        Create Your First Idea
                      </Text>
                    </HStack>
                  </Box>
                </Pressable>
              </Center>
            )}

            {/* Enhanced Conversation List */}
            {sortedIdeas.map((idea) => {
              const categoryConfig = CATEGORY_CONFIG[idea.category] || { emoji: '💡', color: '#6366F1' };
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
                  <GlassCard 
                    p="$5"
                    opacity={0.08}
                    sx={{
                      ':active': {
                        transform: [{ scale: 0.98 }]
                      }
                    }}
                  >
                    <HStack
                      space="md"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <HStack space="md" flex={1} alignItems="center">
                        {/* Enhanced Category Icon */}
                        <Box
                          bg={`${categoryConfig.color}20`}
                          p="$4"
                          borderRadius="$2xl"
                          alignItems="center"
                          justifyContent="center"
                          minWidth="$16"
                          minHeight="$16"
                          borderWidth={2}
                          borderColor={`${categoryConfig.color}40`}
                        >
                          <Text fontSize="$2xl">{categoryConfig.emoji}</Text>
                        </Box>

                        {/* Idea Details */}
                        <VStack flex={1} space="sm">
                          <Text
                            fontWeight="$bold"
                            color={isDark ? "$white" : "$textLight900"}
                            size="lg"
                            numberOfLines={1}
                            lineHeight="$lg"
                          >
                            {idea.title}
                          </Text>
                          <Text
                            size="md"
                            color={isDark ? "$textDark300" : "$textLight600"}
                            numberOfLines={2}
                            lineHeight="$md"
                          >
                            {idea.description}
                          </Text>
                          <HStack space="md" alignItems="center" mt="$1">
                            <HStack space="xs" alignItems="center">
                              <Icon as={MessageCircle} size="xs" color={isDark ? "$textDark400" : "$textLight500"} />
                              <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"} fontWeight="$medium">
                                {messageCount} message{messageCount !== 1 ? 's' : ''}
                              </Text>
                            </HStack>
                            <HStack space="xs" alignItems="center">
                              <Icon as={Clock} size="xs" color={isDark ? "$textDark400" : "$textLight500"} />
                              <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"}>
                                {timeAgo}
                              </Text>
                            </HStack>
                          </HStack>
                        </VStack>
                      </HStack>

                      {/* Enhanced Chevron */}
                      <Box
                        bg={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                        p="$2"
                        borderRadius="$full"
                      >
                        <Icon as={ChevronRight} size="lg" color={isDark ? "$textDark300" : "$textLight400"} />
                      </Box>
                    </HStack>
                  </GlassCard>
                </Pressable>
              );
            })}

            {/* Enhanced Create New Idea CTA at bottom */}
            {sortedIdeas.length > 0 && (
              <Pressable
                onPress={handleCreateNew}
                mt="$4"
                accessibilityRole="button"
                accessibilityLabel="Create new idea"
                accessibilityHint="Double tap to start a new idea session"
              >
                <GlassCard 
                  p="$5" 
                  bg={isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)"}
                  borderWidth={2}
                  borderColor="$primary500"
                  sx={{
                    ':active': {
                      transform: [{ scale: 0.98 }]
                    }
                  }}
                >
                  <HStack
                    space="md"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Box
                      bg="$primary600"
                      p="$2"
                      borderRadius="$full"
                    >
                      <Icon as={Plus} size="lg" color="$white" />
                    </Box>
                    <Text
                      fontWeight="$bold"
                      color="$primary600"
                      size="lg"
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
