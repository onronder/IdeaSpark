import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Copy,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
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

// Enhanced Message Item Component
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
    mb="$4"
  >
    {message.role === 'USER' ? (
      // Enhanced User message
      <Box
        borderRadius="$3xl"
        px="$5"
        py="$4"
        bg="$primary600"
        shadowColor="$primary600"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.3}
        shadowRadius={8}
      >
        <Text color="$white" lineHeight="$xl" fontSize="$md">
          {message.content}
        </Text>
        <Text size="xs" color="$primary200" mt="$2" fontWeight="$medium">
          {formatTimestamp(message.createdAt)}
        </Text>
      </Box>
    ) : (
      // Enhanced AI/System message
      <GlassCard px="$5" py="$4" opacity={message.role === 'SYSTEM' ? 0.08 : 0.08}>
        {message.role !== 'USER' && (
          <HStack space="sm" alignItems="center" mb="$3">
            {message.role === 'ASSISTANT' ? (
              <>
                <Box
                  bg="rgba(139,92,246,0.2)"
                  p="$1.5"
                  borderRadius="$full"
                >
                  <Icon as={Sparkles} size="sm" color="$primary600" />
                </Box>
                <Text size="sm" fontWeight="$bold" color={isDark ? "$primary400" : "$primary700"}>
                  AI Assistant
                </Text>
              </>
            ) : (
              <>
                <Box
                  bg={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
                  p="$1.5"
                  borderRadius="$full"
                >
                  <Icon as={MessageCircle} size="sm" color={isDark ? "$textDark400" : "$textLight500"} />
                </Box>
                <Text size="sm" fontWeight="$bold" color={isDark ? "$textDark300" : "$textLight700"}>
                  System
                </Text>
              </>
            )}
          </HStack>
        )}

        <Text color={isDark ? "$white" : "$textLight900"} lineHeight="$xl" fontSize="$md">
          {message.content}
        </Text>

        <HStack justifyContent="space-between" alignItems="center" mt="$3">
          <Text size="xs" color={isDark ? "$textDark400" : "$textLight500"} fontWeight="$medium">
            {formatTimestamp(message.createdAt)}
            {message.tokens && ` • ${message.tokens} tokens`}
          </Text>

          {/* Enhanced Action icons for assistant messages */}
          {message.role === 'ASSISTANT' && (
            <HStack space="md">
              <Pressable 
                accessibilityRole="button" 
                accessibilityLabel="Copy message"
                p="$1"
              >
                <Icon as={Copy} size="sm" color={isDark ? "$textDark400" : "$textLight500"} />
              </Pressable>
              <Pressable 
                accessibilityRole="button" 
                accessibilityLabel="Like message"
                p="$1"
              >
                <Icon as={ThumbsUp} size="sm" color={isDark ? "$textDark400" : "$textLight500"} />
              </Pressable>
              <Pressable 
                accessibilityRole="button" 
                accessibilityLabel="Regenerate message"
                p="$1"
              >
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

  // Enhanced render header component for FlashList
  const renderListHeader = useCallback(() => (
    <VStack space="lg" px="$5" pt="$6" pb="$4">
      {/* Enhanced initial idea description */}
      <GlassCard p="$5" opacity={0.1}>
        <HStack space="md" alignItems="flex-start" mb="$3">
          <Box
            bg="rgba(139,92,246,0.2)"
            p="$3"
            borderRadius="$2xl"
          >
            <Icon as={Lightbulb} size="xl" color="$primary600" />
          </Box>
          <VStack flex={1}>
            <Text fontWeight="$bold" size="lg" color={isDark ? "$white" : "$primary900"} mb="$2">
              Your Idea
            </Text>
            <Text color={isDark ? "$textDark200" : "$textLight700"} lineHeight="$lg" fontSize="$md">
              {idea.description}
            </Text>
          </VStack>
        </HStack>
      </GlassCard>

      {/* Enhanced welcome message if no messages */}
      {(!messages || messages.length === 0) && (
        <GlassCard p="$5" opacity={0.08}>
          <HStack space="md" alignItems="flex-start">
            <Box 
              bg="rgba(139,92,246,0.2)" 
              borderRadius="$full" 
              p="$3"
            >
              <Icon as={Sparkles} size="lg" color="$primary600" />
            </Box>
            <VStack flex={1} space="sm">
              <Text fontWeight="$bold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                AI Assistant
              </Text>
              <Text color={isDark ? "$textDark200" : "$textLight700"} lineHeight="$lg" fontSize="$md">
                Hello! I'm here to help refine your {idea.category.toLowerCase()} idea.
                What specific aspect would you like to explore first?
              </Text>
              <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"} mt="$2" fontWeight="$medium">
                Just now
              </Text>
            </VStack>
          </HStack>
        </GlassCard>
      )}
    </VStack>
  ), [idea, messages, isDark]);

  // Enhanced render footer component for FlashList with typing indicator
  const renderListFooter = useCallback(() => (
    <Box px="$5" pb="$6">
      {(sendMessage.isPending || isWaitingForResponse) && (
        <Box alignSelf="flex-start" maxWidth="85%">
          <GlassCard px="$5" py="$4" opacity={0.08}>
            <HStack space="md" alignItems="center">
              <Spinner size="small" color="$primary600" />
              <VStack>
                <Text color={isDark ? "$white" : "$textLight900"} fontWeight="$semibold">
                  AI is thinking...
                </Text>
                <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>
                  Analyzing your message
                </Text>
              </VStack>
            </HStack>
          </GlassCard>
        </Box>
      )}
    </Box>
  ), [sendMessage.isPending, isWaitingForResponse, isDark]);

  // Render message item
  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <Box px="$5">
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
            <AnimatedOrb size={100} icon="sparkles" />
            <Text mt="$8" color={isDark ? "$white" : "$textLight900"} size="xl" fontWeight="$semibold">
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
          <Center flex={1} px="$8">
            <AnimatedOrb size={120} icon="lightbulb" />
            <Heading size="2xl" color={isDark ? "$white" : "$textLight900"} mb="$4" mt="$8" textAlign="center" lineHeight="$2xl">
              Idea not found
            </Heading>
            <Text size="lg" color={isDark ? "$textDark300" : "$textLight600"} textAlign="center" mb="$10" lineHeight="$lg">
              This conversation doesn't exist or you don't have access to it
            </Text>
            <Pressable onPress={handleBack}>
              <Box
                bg="$primary600"
                px="$8"
                py="$4"
                borderRadius="$2xl"
                shadowColor="$primary600"
                shadowOffset={{ width: 0, height: 8 }}
                shadowOpacity={0.4}
                shadowRadius={16}
              >
                <ButtonText color="$white" fontWeight="$bold" fontSize="$lg">Go Back</ButtonText>
              </Box>
            </Pressable>
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
            {/* Enhanced Header */}
            <Box px="$5" pt={insets.top + 20} pb="$4">
              <GlassCard p="$5" opacity={0.1}>
                <HStack justifyContent="space-between" alignItems="center">
                  <HStack space="md" alignItems="center" flex={1}>
                    <Pressable
                      onPress={handleBack}
                      accessibilityRole="button"
                      accessibilityLabel="Go back to conversations"
                      accessibilityHint="Double tap to return to conversation list"
                      p="$2"
                      borderRadius="$full"
                      bg={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                    >
                      <Icon as={ArrowLeft} size="xl" color={isDark ? "$white" : "$textLight900"} />
                    </Pressable>
                    <VStack flex={1}>
                      <Text size="xl" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"} numberOfLines={1} lineHeight="$xl">
                        {idea.title}
                      </Text>
                      <HStack space="sm" alignItems="center" mt="$1">
                        <Badge
                          variant="solid"
                          action={
                            idea.status === 'ACTIVE' ? 'success' :
                            idea.status === 'PAUSED' ? 'warning' :
                            'secondary'
                          }
                          size="sm"
                        >
                          <BadgeText fontSize="$xs">{idea.status}</BadgeText>
                        </Badge>
                        <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"} fontWeight="$medium">
                          {idea.category}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>

                  {user?.subscriptionPlan === 'PRO' ? (
                    <Box
                      bg="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                      px="$3"
                      py="$2"
                      borderRadius="$full"
                      shadowColor="$success600"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowOpacity={0.3}
                      shadowRadius={8}
                    >
                      <HStack space="xs" alignItems="center">
                        <Icon as={Crown} size="sm" color="$white" />
                        <Text color="$white" fontWeight="$bold" fontSize="$sm">PRO</Text>
                      </HStack>
                    </Box>
                  ) : (
                    <Pressable onPress={() => router.push('/(app)/upgrade')}>
                      <Box
                        bg="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                        px="$3"
                        py="$2"
                        borderRadius="$full"
                        shadowColor="$warning600"
                        shadowOffset={{ width: 0, height: 4 }}
                        shadowOpacity={0.3}
                        shadowRadius={8}
                      >
                        <Text color="$white" fontWeight="$bold" fontSize="$sm">
                          {remainingReplies !== null ? `${remainingReplies} left` : 'FREE'}
                        </Text>
                      </Box>
                    </Pressable>
                  )}
                </HStack>
              </GlassCard>
            </Box>

            {/* Enhanced Usage Warning for Free Users */}
            {isFreePlan && remainingReplies !== null && remainingReplies <= 1 && (
              <Box px="$5" pb="$4">
                <GlassCard p="$4" opacity={0.1} bg={isDark ? "rgba(251,191,36,0.2)" : "rgba(251,191,36,0.15)"}>
                  <HStack space="md" alignItems="center">
                    <Box
                      bg="rgba(245,158,11,0.3)"
                      p="$2"
                      borderRadius="$full"
                    >
                      <Icon as={AlertTriangle} size="lg" color="$warning600" />
                    </Box>
                    <Text size="md" color={isDark ? "$white" : "$textLight900"} flex={1} fontWeight="$semibold" lineHeight="$md">
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
                estimatedItemSize={120}
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={renderListFooter}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => item.id}
              />
            </Box>

            {/* Enhanced Input Area */}
            <Box px="$5" pt="$4" pb={insets.bottom + 20}>
              <GlassCard p="$4" opacity={0.1}>
                <HStack space="md" alignItems="flex-end">
                  <Box flex={1}>
                    <Textarea
                      size="lg"
                      isDisabled={sendMessage.isPending || isWaitingForResponse || (remainingReplies === 0 && isFreePlan)}
                      h="auto"
                      minHeight="$14"
                      maxHeight="$40"
                      bg={isDark ? "rgba(255,255,255,0.08)" : "$white"}
                      borderColor={isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}
                      borderWidth={2}
                      borderRadius="$2xl"
                      sx={{
                        ':focus': {
                          borderColor: '$primary500',
                          shadowColor: '$primary500',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                        }
                      }}
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
                        fontSize="$md"
                        lineHeight="$lg"
                        accessibilityLabel="Message input"
                        accessibilityHint="Type your message to chat with AI about your idea"
                      />
                    </Textarea>
                  </Box>

                  <Pressable
                    onPress={handleSend}
                    disabled={
                      !inputText.trim() ||
                      sendMessage.isPending ||
                      isWaitingForResponse ||
                      (remainingReplies === 0 && isFreePlan)
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    accessibilityHint="Double tap to send your message to AI"
                  >
                    <Box
                      bg={
                        (!inputText.trim() || sendMessage.isPending || isWaitingForResponse || (remainingReplies === 0 && isFreePlan))
                          ? "$coolGray400"
                          : "$primary600"
                      }
                      w="$14"
                      h="$14"
                      borderRadius="$full"
                      justifyContent="center"
                      alignItems="center"
                      shadowColor="$primary600"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowOpacity={0.4}
                      shadowRadius={8}
                      sx={{
                        ':active': {
                          transform: [{ scale: 0.95 }]
                        }
                      }}
                    >
                      {(sendMessage.isPending || isWaitingForResponse) ? (
                        <Spinner size="small" color="$white" />
                      ) : (
                        <Icon as={Send} size="lg" color="$white" />
                      )}
                    </Box>
                  </Pressable>
                </HStack>
              </GlassCard>
            </Box>
          </Box>
        </KeyboardAvoidingView>
      </GradientBackground>
    </Box>
  );
}
