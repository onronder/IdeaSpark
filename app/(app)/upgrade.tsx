import React, { useState, useEffect } from 'react';
import {
  Box,
  ScrollView,
  VStack,
  HStack,
  Center,
  Heading,
  Text,
  Button,
  ButtonText,
  Card,
  Badge,
  BadgeText,
  Icon,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionTitleText,
  AccordionIcon,
  AccordionContent,
  AccordionContentText,
  Divider,
  Avatar,
  AvatarImage,
  Pressable,
  Spinner,
  Alert,
  AlertIcon,
  AlertText,
} from '@gluestack-ui/themed';
import {
  Crown,
  Sparkles,
  Zap,
  Infinity,
  Users,
  Star,
  Check,
  X,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { iapService, IAPError, IAPErrorType } from '@/services/iapService';
import { getProductId, PRICING_DISPLAY, SUBSCRIPTION_TIERS } from '@/config/iapConfig';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { GradientBackground, GlassCard, AnimatedOrb } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UpgradeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { colorMode } = useTheme();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('UpgradeScreen');
  const insets = useSafeAreaInsets();

  const isDark = colorMode === 'dark';

  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    initializeIAP();
    checkSubscriptionStatus();

    return () => {
      // Cleanup IAP service when leaving screen
      iapService.disconnect();
    };
  }, []);

  const initializeIAP = async () => {
    try {
      await iapService.initialize();
      const availableProducts = iapService.getAvailableSubscriptions();
      setProducts(availableProducts);
      logger.info('IAP initialized', { productCount: availableProducts.length });
    } catch (error: any) {
      logger.error('IAP initialization failed', error);
      if (error instanceof IAPError && error.type === IAPErrorType.CONNECTION_FAILED) {
        toast.error(
          'Store Connection Failed',
          'Unable to connect to the app store. Please check your connection and try again.'
        );
      }
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await iapService.checkSubscriptionStatus();
      setSubscriptionStatus(status);

      if (status.isActive) {
        logger.info('Active subscription found', status);
      }
    } catch (error) {
      logger.error('Failed to check subscription status', error);
    }
  };

  const handlePurchase = async (planType: 'MONTHLY' | 'YEARLY') => {
    if (isLoading) return;

    setIsLoading(true);
    logger.logUserAction('purchase_attempt', { planType });

    try {
      const productId = getProductId(`PRO_${planType}`);

      if (!productId) {
        throw new Error('Product not found');
      }

      await iapService.purchaseSubscription(productId);

      // Refresh user data after successful purchase
      await refreshUser();

      toast.success(
        'Welcome to Pro!',
        'Your subscription has been activated. Enjoy unlimited features!'
      );

      // Navigate back to home
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (error: any) {
      if (error instanceof IAPError) {
        switch (error.type) {
          case IAPErrorType.PURCHASE_CANCELLED:
            // User cancelled, no need to show error
            break;
          case IAPErrorType.PURCHASE_FAILED:
            toast.error('Purchase Failed', 'Unable to complete your purchase. Please try again.');
            break;
          case IAPErrorType.VALIDATION_FAILED:
            toast.error('Validation Failed', 'Unable to validate your purchase. Please contact support.');
            break;
          default:
            handleError(error, 'An error occurred during purchase');
        }
      } else {
        handleError(error, 'Purchase failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (isRestoring) return;

    setIsRestoring(true);
    logger.logUserAction('restore_purchases_attempt');

    try {
      const status = await iapService.restorePurchases();

      if (status.isActive) {
        await refreshUser();
        toast.success(
          'Purchases Restored',
          'Your Pro subscription has been restored successfully!'
        );

        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        toast.info(
          'No Purchases Found',
          'No previous purchases found to restore.'
        );
      }
    } catch (error: any) {
      if (error instanceof IAPError && error.type === IAPErrorType.RESTORE_FAILED) {
        toast.error(
          'Restore Failed',
          'Unable to restore purchases. Please try again later.'
        );
      } else {
        handleError(error, 'Failed to restore purchases');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const features = [
    { icon: Infinity, text: "Unlimited idea sessions" },
    { icon: Sparkles, text: "Unlimited AI replies per session" },
    { icon: Zap, text: "Priority response time" },
    { icon: Users, text: "Collaborate with team members" },
    { icon: Star, text: "Advanced analytics dashboard" },
  ];

  const comparisonData = [
    { feature: "Idea Sessions", free: "3", pro: "Unlimited" },
    { feature: "AI Replies per Session", free: "5", pro: "Unlimited" },
    { feature: "Response Time", free: "Standard", pro: "Priority" },
    { feature: "Team Collaboration", free: false, pro: true },
    { feature: "Analytics Dashboard", free: false, pro: true },
    { feature: "Export Ideas", free: false, pro: true },
  ];

  const faqs = [
    {
      question: "Can I cancel anytime?",
      answer: `Yes, you can cancel your subscription at any time through your ${Platform.OS === 'ios' ? 'Apple ID settings' : 'Google Play settings'}. You'll continue to have access until the end of your current billing period.`
    },
    {
      question: "How does billing work?",
      answer: `Subscriptions are billed through your ${Platform.OS === 'ios' ? 'Apple ID' : 'Google Play account'}. The amount will be charged to your account after confirming the purchase.`
    },
    {
      question: "Can I switch between monthly and yearly?",
      answer: `Yes, you can change your subscription plan at any time. The new plan will take effect at the next billing cycle.`
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "Your data remains safe and accessible. If you cancel, you'll return to the Free plan with limited features, but your existing ideas will remain."
    }
  ];

  // Get actual prices from products if available
  const getProductPrice = (planType: 'MONTHLY' | 'YEARLY') => {
    const productId = getProductId(`PRO_${planType}`);
    const product = products.find(p => p.productId === productId);

    if (product) {
      return product.localizedPrice || PRICING_DISPLAY[`PRO_${planType}`].displayPrice;
    }

    return PRICING_DISPLAY[`PRO_${planType}`].displayPrice;
  };

  // If user already has Pro, show manage subscription screen
  if (subscriptionStatus?.isActive) {
    return (
      <Box flex={1}>
        <GradientBackground>
          <Box px="$4" pt={insets.top + 20} pb="$6">
            <Center>
              <AnimatedOrb size={100} icon="sparkles" />
              <Heading size="xl" mb="$2" mt="$6" color={isDark ? "$white" : "$textLight900"}>You're a Pro Member!</Heading>
              <Text color={isDark ? "$textDark400" : "$textLight600"} textAlign="center" px="$4">
                You have full access to all premium features
              </Text>
            </Center>
          </Box>

          <ScrollView flex={1} px="$4" pb="$6" showsVerticalScrollIndicator={false}>
            <VStack space="lg">
              <GlassCard p="$6" opacity={0.08}>
                <VStack space="md">
                  <HStack space="sm" alignItems="center">
                    <Icon as={ShieldCheck} size="md" color="$success600" />
                    <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"}>Active Subscription</Text>
                  </HStack>

                  {subscriptionStatus.billingPeriod && (
                    <Text color={isDark ? "$textDark300" : "$textLight700"}>
                      Plan: Pro {subscriptionStatus.billingPeriod === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                    </Text>
                  )}

                  {subscriptionStatus.expiryDate && (
                    <Text color={isDark ? "$textDark300" : "$textLight700"}>
                      Next billing date: {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                    </Text>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    action="secondary"
                    onPress={handleManageSubscription}
                    mt="$4"
                  >
                    <ButtonText>Manage Subscription</ButtonText>
                  </Button>
                </VStack>
              </GlassCard>

              <GlassCard p="$6" opacity={0.08}>
                <VStack space="md">
                  <Heading size="md" color={isDark ? "$white" : "$textLight900"}>Your Pro Benefits</Heading>
                  {features.map((feature, index) => (
                    <HStack key={index} space="md" alignItems="center">
                      <Icon as={feature.icon} size="sm" color="$primary500" />
                      <Text color={isDark ? "$textDark300" : "$textLight700"} flex={1}>{feature.text}</Text>
                    </HStack>
                  ))}
                </VStack>
              </GlassCard>
            </VStack>
          </ScrollView>
        </GradientBackground>
      </Box>
    );
  }

  return (
    <Box flex={1}>
      <GradientBackground>
        {/* Header */}
        <Box px="$4" pt={insets.top + 20} pb="$6">
          <Center>
            <AnimatedOrb size={100} icon="sparkles" />
            <Heading size="xl" mb="$2" mt="$6" color={isDark ? "$white" : "$textLight900"}>Unlock Premium Features</Heading>
            <Text color={isDark ? "$textDark400" : "$textLight600"} textAlign="center" px="$4">
              Choose your plan and start creating unlimited ideas
            </Text>
          </Center>
        </Box>

        <ScrollView flex={1} px="$4" pb="$6" showsVerticalScrollIndicator={false}>
        <VStack space="2xl">
            {/* Plan Selection Tabs */}
            <HStack space="sm" justifyContent="center">
              <Pressable
                onPress={() => setSelectedPlan('MONTHLY')}
                flex={1}
              >
                <GlassCard
                  p="$4"
                  opacity={selectedPlan === 'MONTHLY' ? 0.15 : 0.08}
                  borderColor={selectedPlan === 'MONTHLY' ? '$primary500' : (isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)")}
                  borderWidth={selectedPlan === 'MONTHLY' ? 2 : 1}
                >
                  <VStack alignItems="center">
                    <Text fontWeight="$semibold" size="md" color={isDark ? "$white" : "$textLight900"}>Monthly</Text>
                    <Text size="xl" fontWeight="$bold" color="$primary600">
                      {getProductPrice('MONTHLY').split('/')[0]}
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>/month</Text>
                  </VStack>
                </GlassCard>
              </Pressable>

              <Pressable
                onPress={() => setSelectedPlan('YEARLY')}
                flex={1}
              >
                <GlassCard
                  p="$4"
                  opacity={selectedPlan === 'YEARLY' ? 0.15 : 0.08}
                  borderColor={selectedPlan === 'YEARLY' ? '$primary500' : (isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)")}
                  borderWidth={selectedPlan === 'YEARLY' ? 2 : 1}
                >
                  <Badge
                    action="success"
                    variant="solid"
                    position="absolute"
                    top={-10}
                    right="$4"
                    zIndex={1}
                  >
                    <BadgeText>Save 17%</BadgeText>
                  </Badge>
                  <VStack alignItems="center">
                    <Text fontWeight="$semibold" size="md" color={isDark ? "$white" : "$textLight900"}>Yearly</Text>
                    <Text size="xl" fontWeight="$bold" color="$primary600">
                      {getProductPrice('YEARLY').split('/')[0]}
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark400" : "$textLight600"}>/year</Text>
                  </VStack>
                </GlassCard>
              </Pressable>
            </HStack>

          {/* Purchase Button */}
          <VStack space="md">
            <Button
              size="lg"
              variant="solid"
              action="primary"
              bg="$secondary500"
              onPress={() => handlePurchase(selectedPlan)}
              isDisabled={isLoading || products.length === 0}
            >
              {isLoading ? (
                <Spinner color="$white" />
              ) : (
                <ButtonText>
                  Subscribe to Pro {selectedPlan === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                </ButtonText>
              )}
            </Button>

            {/* Restore Purchases Button */}
            <Button
              size="md"
              variant="outline"
              action="secondary"
              onPress={handleRestorePurchases}
              isDisabled={isRestoring}
            >
              {isRestoring ? (
                <Spinner color="$primary600" />
              ) : (
                <HStack space="sm" alignItems="center">
                  <Icon as={RefreshCw} size="sm" color="$primary600" />
                  <ButtonText>Restore Purchases</ButtonText>
                </HStack>
              )}
            </Button>

              {/* Security Note */}
              <GlassCard p="$3" opacity={0.1} bg={isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)"}>
                <HStack space="sm" alignItems="center">
                  <Icon as={ShieldCheck} size="sm" color="$info500" />
                  <Text size="sm" color={isDark ? "$white" : "$textLight900"} flex={1}>
                    Secure payment through {Platform.OS === 'ios' ? 'Apple App Store' : 'Google Play Store'}
                  </Text>
                </HStack>
              </GlassCard>
            </VStack>

            {/* Features List */}
            <GlassCard p="$6" opacity={0.08}>
              <VStack space="md">
                <Heading size="md" color={isDark ? "$white" : "$textLight900"}>What's Included in Pro</Heading>
                {features.map((feature, index) => (
                  <HStack key={index} space="md" alignItems="center">
                    <Icon as={feature.icon} size="sm" color="$primary500" />
                    <Text color={isDark ? "$textDark300" : "$textLight700"} flex={1}>{feature.text}</Text>
                  </HStack>
                ))}
              </VStack>
            </GlassCard>

            {/* Comparison Table */}
            <VStack space="md">
              <Heading size="lg" textAlign="center" color={isDark ? "$white" : "$textLight900"}>Free vs Pro</Heading>

              <GlassCard p="$0" opacity={0.08}>
                {/* Table header */}
                <HStack borderBottomWidth={1} borderBottomColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight200"}>
                  <Box flex={1} p="$4" />
                  <Box flex={1} p="$4">
                    <Center>
                      <Text fontWeight="$bold" color={isDark ? "$white" : "$textLight700"}>Free</Text>
                    </Center>
                  </Box>
                  <Box flex={1} p="$4">
                    <Center>
                      <HStack space="xs" alignItems="center">
                        <Icon as={Crown} size="xs" color="$secondary500" />
                        <Text fontWeight="$bold" color="$secondary500">Pro</Text>
                      </HStack>
                    </Center>
                  </Box>
                </HStack>

                {/* Table rows */}
                {comparisonData.map((item, index) => (
                  <HStack
                    key={index}
                    borderBottomWidth={index < comparisonData.length - 1 ? 1 : 0}
                    borderBottomColor={isDark ? "rgba(255,255,255,0.05)" : "$borderLight100"}
                  >
                    <Box flex={1} p="$4" justifyContent="center">
                      <Text color={isDark ? "$textDark300" : "$textLight700"}>{item.feature}</Text>
                    </Box>
                    <Box flex={1} p="$4">
                      <Center>
                        {typeof item.free === 'boolean' ? (
                          <Icon
                            as={item.free ? Check : X}
                            size="sm"
                            color={item.free ? "$success500" : "$error500"}
                          />
                        ) : (
                          <Text fontWeight="$medium" color={isDark ? "$white" : "$textLight700"}>{item.free}</Text>
                        )}
                      </Center>
                    </Box>
                    <Box flex={1} p="$4">
                      <Center>
                        {typeof item.pro === 'boolean' ? (
                          <Icon
                            as={item.pro ? Check : X}
                            size="sm"
                            color={item.pro ? "$success500" : "$error500"}
                          />
                        ) : (
                          <Text fontWeight="$medium" color="$secondary500">{item.pro}</Text>
                        )}
                      </Center>
                    </Box>
                  </HStack>
                ))}
              </GlassCard>
            </VStack>

            {/* FAQ Accordion */}
            <VStack space="md">
              <Heading size="lg" textAlign="center" color={isDark ? "$white" : "$textLight900"}>Frequently Asked Questions</Heading>

              <GlassCard p="$0" opacity={0.08}>
                <Accordion
                  size="md"
                  variant="unfilled"
                  type="single"
                  defaultValue="item-0"
                >
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionHeader>
                        <AccordionTrigger>
                          <AccordionTitleText color={isDark ? "$white" : "$textLight900"}>{faq.question}</AccordionTitleText>
                          <AccordionIcon as={ChevronDown} ml="$3" color={isDark ? "$textDark400" : "$textLight500"} />
                        </AccordionTrigger>
                      </AccordionHeader>
                      <AccordionContent>
                        <AccordionContentText color={isDark ? "$textDark300" : "$textLight700"}>
                          {faq.answer}
                        </AccordionContentText>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </GlassCard>
            </VStack>
          </VStack>
        </ScrollView>

        {/* Bottom CTA */}
        <Box px="$4" pt="$4" pb={insets.bottom + 16}>
          <GlassCard p="$4" opacity={0.08}>
            <VStack space="sm">
              <Button
                size="lg"
                variant="solid"
                action="primary"
                bg="$secondary500"
                onPress={() => handlePurchase(selectedPlan)}
                isDisabled={isLoading || products.length === 0}
              >
                {isLoading ? (
                  <Spinner color="$white" />
                ) : (
                  <ButtonText>
                    Get Pro - {getProductPrice(selectedPlan)}
                  </ButtonText>
                )}
              </Button>
              <Pressable py="$3" onPress={() => router.back()}>
                <Center>
                  <Text color={isDark ? "$textDark400" : "$textLight600"}>Continue with limited features</Text>
                </Center>
              </Pressable>
            </VStack>
          </GlassCard>
        </Box>
      </GradientBackground>
    </Box>
  );
}