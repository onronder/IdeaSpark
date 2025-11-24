import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  FlatList,
  View,
} from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  Spinner,
} from "@gluestack-ui/themed";
import {
  ArrowLeft,
  Lightbulb,
  Crown,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useIdea, useMessages, useSendMessage, useUsageSummary } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageBubble,
  FilledTextarea,
  PrimaryButton,
  InlineNotice,
  SectionCard,
  TypingDots,
  UsagePill,
} from '@/components/ui';
import { colors, space } from '@/theme/tokens';

interface Message {
  id: string;
  content: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  createdAt: string;
  tokens?: number;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ideaId = params.id as string;
  const { user } = useAuth();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('ChatScreen');
  const { isOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  const [inputText, setInputText] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // API hooks
  const { data: idea, isLoading: ideaLoading } = useIdea(ideaId);
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useMessages(ideaId);
  const sendMessage = useSendMessage();
  const { data: usage } = useUsageSummary();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Refetch messages periodically if waiting for AI response
    const interval = setInterval(() => {
      if (messages?.some(m => m.role === 'USER' && !messages.find(am => am.createdAt > m.createdAt && am.role === 'ASSISTANT'))) {
        refetchMessages();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [messages]);

  const scrollToBottom = () => {
    if (flatListRef.current && messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSend = async () => {
    if (inputText.trim() === '' || sendMessage.isPending || isWaitingForResponse || !isOnline) return;

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
      }
    } catch (err: any) {
      // Handle quota exceeded error
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

  const renderHeader = useCallback(() => (
    <VStack space="md" px={space.lg} pt={space.lg} pb={space.md}>
      {/* Initial idea description */}
      <SectionCard>
        <HStack space="md" alignItems="flex-start">
          <Box
            bg={colors.brand[50]}
            p={space.sm}
            borderRadius={12}
          >
            <Lightbulb color={colors.brand[600]} size={24} />
          </Box>
          <VStack flex={1} space="xs">
            <Text fontWeight="$semibold" fontSize="$md" color={colors.textPrimary}>
              Your Idea
            </Text>
            <Text color={colors.textSecondary} fontSize="$sm" lineHeight={20}>
              {idea?.description}
            </Text>
          </VStack>
        </HStack>
      </SectionCard>

      {/* Welcome message if no messages */}
      {(!messages || messages.length === 0) && (
        <MessageBubble role="assistant" timestamp="Just now">
          Hello! I'm here to help refine your {idea?.category.toLowerCase()} idea.
          What specific aspect would you like to explore first?
        </MessageBubble>
      )}
    </VStack>
  ), [idea, messages]);

  const renderFooter = useCallback(() => (
    <Box px={space.lg} pb={space.md}>
      {(sendMessage.isPending || isWaitingForResponse) && (
        <Box alignSelf="flex-start" maxWidth="85%">
          <TypingDots />
        </Box>
      )}
    </Box>
  ), [sendMessage.isPending, isWaitingForResponse]);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <Box px={space.lg} mb={space.md}>
      <MessageBubble
        role={item.role === 'USER' ? 'user' : 'assistant'}
        timestamp={formatTimestamp(item.createdAt)}
      >
        {item.content}
      </MessageBubble>
    </Box>
  ), []);

  const remainingReplies = idea?.repliesRemaining;
  const isFreePlan = user?.subscriptionPlan === 'FREE';
  const canSendMessage = isOnline && !sendMessage.isPending && !isWaitingForResponse && inputText.trim().length > 0;

  if (ideaLoading || messagesLoading) {
    return (
      <Box flex={1} bg={colors.surfaceMuted} justifyContent="center" alignItems="center">
        <Spinner size="large" color={colors.brand[600]} />
        <Text mt={space.lg} color={colors.textPrimary} fontSize="$lg" fontWeight="$medium">
          Loading conversation...
        </Text>
      </Box>
    );
  }

  if (!idea) {
    return (
      <Box flex={1} bg={colors.surfaceMuted} justifyContent="center" alignItems="center" px={space.xl}>
        <Text fontSize="$2xl" fontWeight="$bold" color={colors.textPrimary} mb={space.md} textAlign="center">
          Idea not found
        </Text>
        <Text fontSize="$md" color={colors.textSecondary} textAlign="center" mb={space.xl}>
          This conversation doesn't exist or you don't have access to it
        </Text>
        <PrimaryButton onPress={() => router.back()}>
          Go Back
        </PrimaryButton>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={colors.surfaceMuted}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <Box flex={1}>
          {/* Header */}
          <Box px={space.lg} pt={insets.top + space.md} pb={space.md} bg={colors.surface}>
            <HStack justifyContent="space-between" alignItems="center">
              <HStack space="md" alignItems="center" flex={1}>
                <Pressable
                  onPress={() => router.back()}
                  p={space.xs}
                  borderRadius={8}
                >
                  <ArrowLeft color={colors.textPrimary} size={24} />
                </Pressable>
                <VStack flex={1}>
                  <Text fontSize="$lg" fontWeight="$bold" color={colors.textPrimary} numberOfLines={1}>
                    {idea.title}
                  </Text>
                  <Text fontSize="$sm" color={colors.textSecondary}>
                    {idea.category}
                  </Text>
                </VStack>
              </HStack>

              {user?.subscriptionPlan === 'PRO' ? (
                <UsagePill text="PRO" variant="pro" />
              ) : (
                <Pressable onPress={() => router.push('/(app)/upgrade')}>
                  <UsagePill text="Upgrade" variant="warning" />
                </Pressable>
              )}
            </HStack>
          </Box>

          {/* Offline Banner */}
          {!isOnline && (
            <Box px={space.lg} pt={space.md}>
              <InlineNotice
                type="warning"
                message="You're offline. Connect to send messages."
              />
            </Box>
          )}

          {/* Quota Warning */}
          {isFreePlan && remainingReplies !== null && remainingReplies !== undefined && remainingReplies <= 1 && (
            <Box px={space.lg} pt={space.md}>
              <InlineNotice
                type="warning"
                title="Low on replies"
                message={`Only ${remainingReplies} AI ${remainingReplies === 1 ? 'reply' : 'replies'} left in this session.`}
                action={{
                  label: 'Upgrade',
                  onPress: () => router.push('/(app)/upgrade'),
                }}
              />
            </Box>
          )}

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages || []}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          />

          {/* Input Area */}
          <Box
            px={space.lg}
            py={space.md}
            bg={colors.surface}
            borderTopWidth={1}
            borderTopColor={colors.borderMuted}
            pb={insets.bottom + space.md}
          >
            <VStack space="sm">
              <FilledTextarea
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                numberOfLines={3}
                isDisabled={!isOnline || sendMessage.isPending || isWaitingForResponse}
              />
              <PrimaryButton
                onPress={handleSend}
                isDisabled={!canSendMessage}
                isLoading={sendMessage.isPending || isWaitingForResponse}
              >
                {sendMessage.isPending || isWaitingForResponse ? 'Sending...' : 'Send Message'}
              </PrimaryButton>
            </VStack>
          </Box>
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
}
