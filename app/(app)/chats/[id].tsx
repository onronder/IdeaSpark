import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  ButtonIcon,
  ButtonText,
  Badge,
  BadgeText,
  Textarea,
  TextareaInput,
  Pressable,
  Alert,
  AlertIcon,
  AlertText,
  Spinner,
  Icon,
  Center,
} from "@gluestack-ui/themed";
import {
  Send,
  Lightbulb,
  Sparkles,
  Crown,
  MessageCircle,
  ArrowLeft,
  ThumbsUp,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIdea, useMessages, useSendMessage, useUsageSummary } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, AnimatedOrb } from '@/components/ui';

interface Message {
  id: string;
  content: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  createdAt: string;
  tokens?: number;
}

// Memoized Message Item Component with Glassmorphism
const MessageItem = React.memo(({
  message,
  formatTimestamp,
  isDark
}: {
  message: Message;
  formatTimestamp: (date: string) => string;
  isDark: boolean;
}) => (
  <Box
    alignSelf={message.role === 'USER' ? 'flex-end' : 'flex-start'}
    maxWidth="85%"
    mb="$3"
  >
    {message.role === 'USER' ? (
      // User message - solid colored glass effect
      <Box
        borderRadius="$2xl"
        px="$4"
        py="$3"
        bg="$primary600"
        shadowColor="$black"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={4}
      >
        <Text color="$white" lineHeight="$lg">
          {message.content}
        </Text>
        <Text size="xs" color="$primary200" mt="$2">
          {formatTimestamp(message.createdAt)}
        </Text>
      </Box>
    ) : (
      // AI/System message - glass card
      <GlassCard px="$4" py="$3" opacity={message.role === 'SYSTEM' ? 0.08 : 0.05}>
        {message.role !== 'USER' && (
          <HStack space="xs" alignItems="center" mb="$2">
            {message.role === 'ASSISTANT' ? (
              <>
                <Icon as={Sparkles} size="xs" color="$primary600" />
                <Text size="xs" fontWeight="$semibold" color={isDark ? "$textDark300" : "$primary700"}>
                  AI Assistant
                </Text>
              </>
            ) : (
              <>
                <Icon as={MessageCircle} size="xs" color={isDark ? "$textDark400" : "$textLight500"} />
                <Text size="xs" fontWeight="$semibold" color={isDark ? "$textDark300" : "$textLight700"}>
                  System
                </Text>
              </>
            )}
          </HStack>
        )}

        <Text color={isDark ? "$white" : "$textLight900"} lineHeight="$lg">
          {message.content}
        </Text>

        <HStack justifyContent="space-between" alignItems="center" mt="$2">
          <Text size="xs" color={isDark ? "$textDark400" : "$textLight500"}>
            {formatTimestamp(message.createdAt)}
            {message.tokens && ` • ${message.tokens} tokens`}
          </Text>

          {/* Action icons for assistant messages */}
          {message.role === 'ASSISTANT' && (
            <HStack space="sm">
              <Pressable accessibilityRole="button" accessibilityLabel="Like message">
                <Icon as={ThumbsUp} size="sm" color={isDark ? "$textDark400" : "$textLight500"} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Regenerate message">
                <Icon as={RefreshCw} size="sm" color={isDark ? "$textDark400" : "$textLight500"} />
              </Pressable>
            </HStack>
          )}
        </HStack>
      </GlassCard>
    )}
  </Box>
));

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ideaId = params.id as string;
  const { user } = useAuth();
  const { colorMode } = useTheme();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('ChatScreen');
  const insets = useSafeAreaInsets();

  const isDark = colorMode === 'dark';

  const [inputText, setInputText] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const flashListRef = useRef<FlashList<any>>(null);

  // API hooks
  const { data: idea, isLoading: ideaLoading } = useIdea(ideaId);
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useMessages(ideaId);
  const sendMessage = useSendMessage();
  const { data: usage } = useUsageSummary();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Refetch messages periodically if there's a pending AI response
    const interval = setInterval(() => {
      if (messages?.some(m => m.role === 'USER' && !messages.find(am => am.createdAt > m.createdAt && am.role === 'ASSISTANT'))) {
        refetchMessages();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [messages]);

  const scrollToBottom = () => {
    if (flashListRef.current && messages && messages.length > 0) {
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSend = async () => {
    if (inputText.trim() === '' || sendMessage.isPending || isWaitingForResponse) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsWaitingForResponse(true);
    logger.logUserAction('send_message', { ideaId, messageLength: messageText.length });

    try {
      const result = await sendMessage.mutateAsync({
        ideaId,
        content: messageText,
      });

      if (result) {
        refetchMessages();

        // Check if there are no replies remaining
        if (result.remainingReplies === 0 && user?.subscriptionPlan === 'FREE') {
          setTimeout(() => {
            toast.showToast({
              type: 'warning',
              title: 'Quota Reached',
              message: "You've used all your free AI replies. Upgrade to Pro for unlimited conversations!",
              action: {
                label: 'Upgrade Now',
                onPress: () => router.push('/(app)/upgrade'),
              },
              duration: 7000,
            });
          }, 1000);
        }

        // Show cost if available
        if (result.usage?.estimatedCost) {
          logger.info('AI response cost', {
            cost: result.usage.estimatedCost,
            tokens: result.usage.totalTokens
          });
        }
      }
    } catch (err: any) {
      // Handle quota exceeded error specially
      if (err.response?.status === 402) {
        toast.showToast({
          type: 'error',
          title: 'Quota Exceeded',
          message: err.response?.data?.message || 'You have reached your message limit.',
          action: {
            label: 'Upgrade',
            onPress: () => router.push('/(app)/upgrade'),
          },
          duration: 7000,
        });
      } else {
        handleError(err, err.message);
      }
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Render header component for FlashList
  const renderListHeader = useCallback(() => (
    <VStack space="md" px="$4" pt="$4">
      {/* Initial idea description */}
      <GlassCard p="$4" opacity={0.08}>
        <HStack space="sm" alignItems="center" mb="$2">
          <Icon as={Lightbulb} size="md" color="$primary600" />
          <Text fontWeight="$semibold" color={isDark ? "$white" : "$primary900"}>Your Idea</Text>
        </HStack>
        <Text color={isDark ? "$textDark300" : "$textLight700"}>{idea.description}</Text>
      </GlassCard>

      {/* Welcome message if no messages */}
      {(!messages || messages.length === 0) && (
        <GlassCard p="$4" mb="$3" opacity={0.05}>
          <HStack space="sm" alignItems="flex-start">
            <Box bg="$primary100" borderRadius="$full" p="$2">
              <Icon as={Sparkles} size="sm" color="$primary600" />
            </Box>
            <VStack flex={1} space="xs">
              <Text fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>AI Assistant</Text>
              <Text color={isDark ? "$textDark300" : "$textLight700"}>
                Hello! I'm here to help refine your {idea.category.toLowerCase()} idea.
                What specific aspect would you like to explore first?
              </Text>
              <Text size="xs" color={isDark ? "$textDark400" : "$textLight500"} mt="$2">Just now</Text>
            </VStack>
          </HStack>
        </GlassCard>
      )}
    </VStack>
  ), [idea, messages, isDark]);

  // Render footer component for FlashList with typing indicator
  const renderListFooter = useCallback(() => (
    <Box px="$4" pb="$4">
      {(sendMessage.isPending || isWaitingForResponse) && (
        <Box alignSelf="flex-start" maxWidth="85%">
          <GlassCard px="$4" py="$3" opacity={0.05}>
            <HStack space="sm" alignItems="center">
              <Spinner size="small" color="$primary600" />
              <Text color={isDark ? "$textDark300" : "$textLight700"}>AI is thinking...</Text>
            </HStack>
          </GlassCard>
        </Box>
      )}
    </Box>
  ), [sendMessage.isPending, isWaitingForResponse, isDark]);

  // Render message item
  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <Box px="$4">
      <MessageItem message={item} formatTimestamp={formatTimestamp} isDark={isDark} />
    </Box>
  ), [isDark]);

  const remainingReplies = idea?.repliesRemaining;
  const isFreePlan = user?.subscriptionPlan === 'FREE';

  if (ideaLoading || messagesLoading) {
    return (
      <Box flex={1}>
        <GradientBackground>
          <Center flex={1}>
            <AnimatedOrb size={80} icon="sparkles" />
            <Text mt="$6" color={isDark ? "$white" : "$textLight900"} size="lg">
              Loading conversation...
            </Text>
          </Center>
        </GradientBackground>
      </Box>
    );
  }

  if (!idea) {
    return (
      <Box flex={1}>
        <GradientBackground>
          <Center flex={1} px="$6">
            <AnimatedOrb size={100} icon="lightbulb" animate={false} />
            <Heading size="xl" color={isDark ? "$white" : "$textLight900"} mb="$3" mt="$6" textAlign="center">
              Idea not found
            </Heading>
            <Text size="md" color={isDark ? "$textDark400" : "$textLight500"} textAlign="center" mb="$8">
              This conversation doesn't exist or you don't have access to it
            </Text>
            <Button variant="solid" action="primary" onPress={handleBack}>
              <ButtonText>Go Back</ButtonText>
            </Button>
          </Center>
        </GradientBackground>
      </Box>
    );
  }

  return (
    <Box flex={1}>
      <GradientBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <Box flex={1}>
            {/* Header with Glassmorphism */}
            <Box px="$4" pt={insets.top + 16} pb="$4">
              <GlassCard p="$4" opacity={0.08}>
                <HStack justifyContent="space-between" alignItems="center">
                  <HStack space="sm" alignItems="center" flex={1}>
                    <Pressable
                      onPress={handleBack}
                      accessibilityRole="button"
                      accessibilityLabel="Go back to conversations"
                      accessibilityHint="Double tap to return to conversation list"
                    >
                      <Icon as={ArrowLeft} size="lg" color={isDark ? "$white" : "$textLight900"} />
                    </Pressable>
                    <VStack flex={1}>
                      <Text size="lg" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"} numberOfLines={1}>
                        {idea.title}
                      </Text>
                      <HStack space="xs" alignItems="center" mt="$1">
                        <Badge
                          variant="solid"
                          action={
                            idea.status === 'ACTIVE' ? 'success' :
                            idea.status === 'PAUSED' ? 'warning' :
                            'secondary'
                          }
                          size="sm"
                        >
                          <BadgeText>{idea.status}</BadgeText>
                        </Badge>
                        <Text size="xs" color={isDark ? "$textDark400" : "$textLight500"}>
                          {idea.category}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>

                  {user?.subscriptionPlan === 'PRO' ? (
                    <Badge variant="solid" action="success" size="md">
                      <BadgeText>PRO</BadgeText>
                    </Badge>
                  ) : (
                    <Pressable onPress={() => router.push('/(app)/upgrade')}>
                      <Badge variant="solid" action="warning" size="md">
                        <BadgeText>
                          {remainingReplies !== null ? `${remainingReplies} left` : 'FREE'}
                        </BadgeText>
                      </Badge>
                    </Pressable>
                  )}
                </HStack>
              </GlassCard>
            </Box>

            {/* Usage Warning for Free Users */}
            {isFreePlan && remainingReplies !== null && remainingReplies <= 1 && (
              <Box px="$4" pb="$3">
                <GlassCard p="$3" opacity={0.1} bg={isDark ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.1)"}>
                  <HStack space="sm" alignItems="center">
                    <Icon as={AlertTriangle} size="sm" color="$warning500" />
                    <Text size="sm" color={isDark ? "$white" : "$textLight900"} flex={1}>
                      {remainingReplies === 0
                        ? "You've used all your free replies. Upgrade to continue!"
                        : 'This is your last free reply. Make it count!'}
                    </Text>
                  </HStack>
                </GlassCard>
              </Box>
            )}

            {/* Messages */}
            <Box flex={1}>
              <FlashList
                ref={flashListRef}
                data={messages || []}
                renderItem={renderMessage}
                estimatedItemSize={100}
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={renderListFooter}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => item.id}
              />
            </Box>

            {/* Input Area with Glassmorphism */}
            <Box px="$4" pt="$4" pb={insets.bottom + 16}>
              <GlassCard p="$4" opacity={0.08}>
                <HStack space="sm" alignItems="flex-end">
                  <Box flex={1}>
                    <Textarea
                      size="lg"
                      isDisabled={sendMessage.isPending || isWaitingForResponse || (remainingReplies === 0 && isFreePlan)}
                      h="auto"
                      minHeight="$12"
                      maxHeight="$32"
                      bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                      borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
                    >
                      <TextareaInput
                        placeholder={
                          remainingReplies === 0 && isFreePlan
                            ? "Upgrade to Pro to continue chatting..."
                            : "Type your message..."
                        }
                        value={inputText}
                        onChangeText={setInputText}
                        maxLength={4000}
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        accessibilityLabel="Message input"
                        accessibilityHint="Type your message to chat with AI about your idea"
                      />
                    </Textarea>
                  </Box>

                  <Button
                    size="lg"
                    borderRadius="$full"
                    variant="solid"
                    action="primary"
                    isDisabled={
                      !inputText.trim() ||
                      sendMessage.isPending ||
                      isWaitingForResponse ||
                      (remainingReplies === 0 && isFreePlan)
                    }
                    onPress={handleSend}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    accessibilityHint="Double tap to send your message to AI"
                  >
                    {(sendMessage.isPending || isWaitingForResponse) ? (
                      <Spinner size="small" color="$white" />
                    ) : (
                      <ButtonIcon as={Send} />
                    )}
                  </Button>
                </HStack>
              </GlassCard>
            </Box>
          </Box>
        </KeyboardAvoidingView>
      </GradientBackground>
    </Box>
  );
}