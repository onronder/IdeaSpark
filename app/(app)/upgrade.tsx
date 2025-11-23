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
  ButtonIcon,
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
  TrendingUp,
  MessageCircle,
  Lightbulb,
  Target,
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
      logger.info('Subscription status checked', status);
    } catch (error: any) {
      logger.error('Failed to check subscription status', error);
    }
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    logger.logUserAction('purchase_initiated', { plan: selectedPlan });

    try {
      const productId = getProductId(`PRO_${selectedPlan}`);
      const result = await iapService.purchaseSubscription(productId);

      if (result.success) {
        toast.success('Welcome to Pro!', 'Your subscription is now active');
        await refreshUser();
        logger.logUserAction('purchase_completed', { plan: selectedPlan });
        router.back();
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error: any) {
      if (error instanceof IAPError) {
        switch (error.type) {
          case IAPErrorType.USER_CANCELLED:
            logger.info('User cancelled purchase');
            break;
          case IAPErrorType.PAYMENT_FAILED:
            toast.error('Payment Failed', 'There was an issue processing your payment. Please try again.');
            break;
          case IAPErrorType.PRODUCT_NOT_AVAILABLE:
            toast.error('Product Unavailable', 'This subscription is currently unavailable. Please try again later.');
            break;
          default:
            handleError(error, 'Failed to complete purchase');
        }
      } else {
        handleError(error, 'Failed to complete purchase');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    logger.logUserAction('restore_purchases_initiated');

    try {
      const result = await iapService.restorePurchases();

      if (result.restored) {
        toast.success('Purchases Restored', 'Your subscription has been restored successfully');
        await refreshUser();
        await checkSubscriptionStatus();
        logger.logUserAction('restore_purchases_completed');
      } else {
        toast.showToast({
          type: 'info',
          title: 'No Purchases Found',
          message: 'We could not find any previous purchases to restore.',
          duration: 5000,
        });
      }
    } catch (error: any) {
      handleError(error, 'Failed to restore purchases');
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
    { icon: Infinity, text: "Unlimited idea sessions", color: "#8B5CF6" },
    { icon: Sparkles, text: "Unlimited AI replies per session", color: "#3B82F6" },
    { icon: Zap, text: "Priority response time", color: "#F59E0B" },
    { icon: TrendingUp, text: "Advanced analytics dashboard", color: "#10B981" },
    { icon: Target, text: "Export ideas to PDF", color: "#EC4899" },
    { icon: Users, text: "Collaborate with team members", color: "#6366F1" },
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
          <Box px="$5" pt={insets.top + 24} pb="$8">
            <Center>
              <AnimatedOrb size={140} icon="sparkles" />
              <Heading size="3xl" mb="$4" mt="$8" color={isDark ? "$white" : "$textLight900"} textAlign="center" lineHeight="$3xl">
                You're a Pro Member!
              </Heading>
              <Text color={isDark ? "$textDark300" : "$textLight600"} textAlign="center" px="$6" size="lg" lineHeight="$lg">
                You have full access to all premium features
              </Text>
            </Center>
          </Box>

          <ScrollView flex={1} px="$5" pb="$8" showsVerticalScrollIndicator={false}>
            <VStack space="xl">
              <GlassCard p="$8" opacity={0.1}>
                <VStack space="lg">
                  <HStack space="md" alignItems="center">
                    <Box
                      bg="rgba(16,185,129,0.2)"
                      p="$3"
                      borderRadius="$xl"
                    >
                      <Icon as={ShieldCheck} size="xl" color="$success600" />
                    </Box>
                    <Text fontWeight="$bold" size="xl" color={isDark ? "$white" : "$textLight900"}>
                      Active Subscription
                    </Text>
                  </HStack>

                  {subscriptionStatus.billingPeriod && (
                    <Text color={isDark ? "$textDark200" : "$textLight700"} size="lg">
                      Plan: Pro {subscriptionStatus.billingPeriod === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                    </Text>
                  )}

                  {subscriptionStatus.expiryDate && (
                    <Text color={isDark ? "$textDark200" : "$textLight700"} size="lg">
                      Next billing date: {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                    </Text>
                  )}

                  <Pressable onPress={handleManageSubscription} mt="$4">
                    <Box
                      bg={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                      px="$8"
                      py="$4"
                      borderRadius="$2xl"
                      borderWidth={2}
                      borderColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                      sx={{
                        ':active': {
                          transform: [{ scale: 0.98 }]
                        }
                      }}
                    >
                      <Text textAlign="center" fontWeight="$bold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                        Manage Subscription
                      </Text>
                    </Box>
                  </Pressable>
                </VStack>
              </GlassCard>

              <GlassCard p="$8" opacity={0.08}>
                <VStack space="lg">
                  <Heading size="xl" color={isDark ? "$white" : "$textLight900"}>
                    Your Pro Benefits
                  </Heading>
                  {features.map((feature, index) => (
                    <HStack key={index} space="md" alignItems="center">
                      <Box
                        bg={`${feature.color}30`}
                        p="$2.5"
                        borderRadius="$lg"
                      >
                        <Icon as={feature.icon} size="lg" color={feature.color} />
                      </Box>
                      <Text color={isDark ? "$textDark200" : "$textLight700"} flex={1} size="md" lineHeight="$md">
                        {feature.text}
                      </Text>
                      <Icon as={Check} size="lg" color="$success600" />
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
        {/* Enhanced Header */}
        <Box px="$5" pt={insets.top + 24} pb="$8">
          <Center>
            <AnimatedOrb size={140} icon="sparkles" />
            <Heading size="3xl" mb="$4" mt="$8" color={isDark ? "$white" : "$textLight900"} textAlign="center" lineHeight="$3xl">
              Unlock Premium Features
            </Heading>
            <Text color={isDark ? "$textDark300" : "$textLight600"} textAlign="center" px="$6" size="lg" lineHeight="$lg">
              Choose your plan and start creating unlimited ideas
            </Text>
          </Center>
        </Box>

        <ScrollView flex={1} px="$5" pb="$8" showsVerticalScrollIndicator={false}>
          <VStack space="2xl">
            {/* Enhanced Plan Selection */}
            <HStack space="md" justifyContent="center">
              <Pressable
                onPress={() => setSelectedPlan('MONTHLY')}
                flex={1}
              >
                <GlassCard
                  p="$6"
                  opacity={selectedPlan === 'MONTHLY' ? 0.15 : 0.08}
                  borderColor={selectedPlan === 'MONTHLY' ? '$primary500' : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}
                  borderWidth={selectedPlan === 'MONTHLY' ? 3 : 2}
                  sx={{
                    ':active': {
                      transform: [{ scale: 0.95 }]
                    }
                  }}
                >
                  <VStack alignItems="center" space="xs">
                    <Text fontWeight="$bold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                      Monthly
                    </Text>
                    <Text size="3xl" fontWeight="$bold" color="$primary600" lineHeight="$3xl">
                      {getProductPrice('MONTHLY').split('/')[0]}
                    </Text>
                    <Text size="md" color={isDark ? "$textDark400" : "$textLight600"} fontWeight="$medium">
                      /month
                    </Text>
                  </VStack>
                </GlassCard>
              </Pressable>

              <Pressable
                onPress={() => setSelectedPlan('YEARLY')}
                flex={1}
              >
                <GlassCard
                  p="$6"
                  opacity={selectedPlan === 'YEARLY' ? 0.15 : 0.08}
                  borderColor={selectedPlan === 'YEARLY' ? '$primary500' : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}
                  borderWidth={selectedPlan === 'YEARLY' ? 3 : 2}
                  sx={{
                    ':active': {
                      transform: [{ scale: 0.95 }]
                    }
                  }}
                >
                  <Box
                    bg="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                    position="absolute"
                    top={-12}
                    right="$4"
                    px="$3"
                    py="$1.5"
                    borderRadius="$full"
                    shadowColor="$success600"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.3}
                    shadowRadius={8}
                    zIndex={1}
                  >
                    <Text color="$white" fontWeight="$bold" fontSize="$xs">SAVE 17%</Text>
                  </Box>
                  <VStack alignItems="center" space="xs">
                    <Text fontWeight="$bold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                      Yearly
                    </Text>
                    <Text size="3xl" fontWeight="$bold" color="$primary600" lineHeight="$3xl">
                      {getProductPrice('YEARLY').split('/')[0]}
                    </Text>
                    <Text size="md" color={isDark ? "$textDark400" : "$textLight600"} fontWeight="$medium">
                      /year
                    </Text>
                  </VStack>
                </GlassCard>
              </Pressable>
            </HStack>

            {/* Enhanced Purchase Button */}
            <VStack space="md">
              <Pressable
                onPress={handlePurchase}
                disabled={isLoading}
              >
                <Box
                  bg={isLoading ? "$coolGray400" : "$primary600"}
                  h="$20"
                  borderRadius="$3xl"
                  justifyContent="center"
                  alignItems="center"
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
                  {isLoading ? (
                    <Spinner color="$white" size="large" />
                  ) : (
                    <HStack space="sm" alignItems="center">
                      <Icon as={Crown} size="xl" color="$white" />
                      <Text color="$white" fontWeight="$bold" fontSize="$xl">
                        Subscribe to Pro {selectedPlan === 'YEARLY' ? 'Yearly' : 'Monthly'}
                      </Text>
                    </HStack>
                  )}
                </Box>
              </Pressable>

              <Pressable onPress={handleRestorePurchases} disabled={isRestoring}>
                <Box
                  bg={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                  h="$14"
                  borderRadius="$2xl"
                  justifyContent="center"
                  alignItems="center"
                  borderWidth={2}
                  borderColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                  sx={{
                    ':active': {
                      transform: [{ scale: 0.98 }]
                    }
                  }}
                >
                  {isRestoring ? (
                    <Spinner color={isDark ? "$white" : "$textLight900"} />
                  ) : (
                    <HStack space="sm" alignItems="center">
                      <Icon as={RefreshCw} size="md" color={isDark ? "$white" : "$textLight900"} />
                      <Text color={isDark ? "$white" : "$textLight900"} fontWeight="$semibold" fontSize="$md">
                        Restore Purchases
                      </Text>
                    </HStack>
                  )}
                </Box>
              </Pressable>

              <Box
                bg={isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)"}
                p="$4"
                borderRadius="$xl"
                borderWidth={1}
                borderColor="$info500"
              >
                <HStack space="sm" alignItems="center">
                  <Icon as={ShieldCheck} size="md" color="$info600" />
                  <Text size="sm" color={isDark ? "$textDark200" : "$textLight700"} flex={1} lineHeight="$sm">
                    Secure payment through {Platform.OS === 'ios' ? 'Apple App Store' : 'Google Play'}
                  </Text>
                </HStack>
              </Box>
            </VStack>

            {/* Enhanced Features List */}
            <GlassCard p="$8" opacity={0.08}>
              <VStack space="lg">
                <Heading size="2xl" color={isDark ? "$white" : "$textLight900"} textAlign="center" lineHeight="$2xl">
                  What's Included in Pro
                </Heading>
                {features.map((feature, index) => (
                  <HStack key={index} space="md" alignItems="center">
                    <Box
                      bg={`${feature.color}30`}
                      p="$3"
                      borderRadius="$xl"
                    >
                      <Icon as={feature.icon} size="xl" color={feature.color} />
                    </Box>
                    <Text color={isDark ? "$textDark200" : "$textLight700"} flex={1} size="lg" fontWeight="$medium" lineHeight="$lg">
                      {feature.text}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </GlassCard>

            {/* Enhanced Comparison Table */}
            <GlassCard p="$8" opacity={0.08}>
              <VStack space="lg">
                <Heading size="2xl" color={isDark ? "$white" : "$textLight900"} textAlign="center" lineHeight="$2xl">
                  Free vs Pro
                </Heading>
                
                <VStack space="md">
                  {/* Header Row */}
                  <HStack justifyContent="space-between" pb="$3" borderBottomWidth={2} borderColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}>
                    <Text fontWeight="$bold" size="md" color={isDark ? "$textDark300" : "$textLight600"} flex={1}>
                      Feature
                    </Text>
                    <Text fontWeight="$bold" size="md" color={isDark ? "$textDark300" : "$textLight600"} textAlign="center" width="$20">
                      Free
                    </Text>
                    <Text fontWeight="$bold" size="md" color="$primary600" textAlign="center" width="$20">
                      Pro
                    </Text>
                  </HStack>

                  {/* Data Rows */}
                  {comparisonData.map((row, index) => (
                    <HStack key={index} justifyContent="space-between" py="$3" borderBottomWidth={1} borderColor={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}>
                      <Text size="md" color={isDark ? "$textDark200" : "$textLight700"} flex={1} fontWeight="$medium">
                        {row.feature}
                      </Text>
                      <Box width="$20" alignItems="center">
                        {typeof row.free === 'boolean' ? (
                          <Icon as={row.free ? Check : X} size="lg" color={row.free ? "$success600" : "$error500"} />
                        ) : (
                          <Text size="md" color={isDark ? "$textDark300" : "$textLight600"} textAlign="center">
                            {row.free}
                          </Text>
                        )}
                      </Box>
                      <Box width="$20" alignItems="center">
                        {typeof row.pro === 'boolean' ? (
                          <Icon as={row.pro ? Check : X} size="lg" color={row.pro ? "$success600" : "$error500"} />
                        ) : (
                          <Text size="md" color="$primary600" fontWeight="$bold" textAlign="center">
                            {row.pro}
                          </Text>
                        )}
                      </Box>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </GlassCard>

            {/* Enhanced FAQ Section */}
            <GlassCard p="$8" opacity={0.08}>
              <VStack space="lg">
                <Heading size="2xl" color={isDark ? "$white" : "$textLight900"} textAlign="center" lineHeight="$2xl">
                  Frequently Asked Questions
                </Heading>
                
                <Accordion type="single" variant="unfilled">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionHeader>
                        <AccordionTrigger>
                          {({ isExpanded }) => (
                            <HStack justifyContent="space-between" alignItems="center" flex={1} py="$3">
                              <Text fontWeight="$semibold" size="lg" color={isDark ? "$white" : "$textLight900"} flex={1} lineHeight="$lg">
                                {faq.question}
                              </Text>
                              <AccordionIcon as={ChevronDown} ml="$3" color={isDark ? "$textDark300" : "$textLight500"} />
                            </HStack>
                          )}
                        </AccordionTrigger>
                      </AccordionHeader>
                      <AccordionContent>
                        <AccordionContentText color={isDark ? "$textDark300" : "$textLight600"} size="md" lineHeight="$lg" pb="$4">
                          {faq.answer}
                        </AccordionContentText>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </VStack>
            </GlassCard>

            {/* Enhanced Bottom CTA */}
            <Center py="$6">
              <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"} textAlign="center" px="$8" lineHeight="$sm">
                Continue with limited features
              </Text>
              <Pressable onPress={() => router.back()} mt="$4">
                <Text color="$primary600" fontWeight="$semibold" size="md">
                  Maybe Later
                </Text>
              </Pressable>
            </Center>
          </VStack>
        </ScrollView>
      </GradientBackground>
    </Box>
  );
}
