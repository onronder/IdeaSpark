import React, { useState, useEffect } from 'react';
import {
  Box,
  ScrollView,
  VStack,
  HStack,
  Text,
  Pressable,
} from '@gluestack-ui/themed';
import {
  Crown,
  Infinity,
  Sparkles,
  Zap,
  TrendingUp,
  Target,
  Users,
  Check,
  X,
} from 'lucide-react-native';
import { Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from '@/contexts/ToastContext';
import { iapService, IAPError, IAPErrorType } from '@/services/iapService';
import { getProductId, PRICING_DISPLAY } from '@/config/iapConfig';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import {
  HeaderGradient,
  SectionCard,
  PrimaryButton,
  GhostPillButton,
  SegmentedTabs,
  InlineNotice,
  ListItem,
} from '@/components/ui';
import { colors, space, shadows } from '@/theme/tokens';

export default function UpgradeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('UpgradeScreen');

  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    initializeIAP();
    checkSubscriptionStatus();

    return () => {
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
    { icon: Infinity, text: "Unlimited idea sessions" },
    { icon: Sparkles, text: "Unlimited AI replies per session" },
    { icon: Zap, text: "Priority response time" },
    { icon: TrendingUp, text: "Advanced analytics dashboard" },
    { icon: Target, text: "Export ideas to PDF" },
    { icon: Users, text: "Collaborate with team members" },
  ];

  const comparisonData = [
    { feature: "Idea Sessions", free: "3", pro: "Unlimited" },
    { feature: "AI Replies per Session", free: "5", pro: "Unlimited" },
    { feature: "Response Time", free: "Standard", pro: "Priority" },
    { feature: "Team Collaboration", free: false, pro: true },
    { feature: "Analytics Dashboard", free: false, pro: true },
    { feature: "Export Ideas", free: false, pro: true },
  ];

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
      <Box flex={1} bg={colors.surfaceMuted}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <HeaderGradient
            greeting="You're a Pro Member!"
            name="✨"
            usageText="Full access to all premium features"
            showUpgradeButton={false}
          />

          <VStack space="lg" px={space.lg} py={space.lg}>
            <SectionCard>
              <VStack space="md">
                <HStack space="md" alignItems="center">
                  <Box
                    bg={colors.successLight}
                    p={space.sm}
                    borderRadius={12}
                  >
                    <Crown color={colors.success} size={24} />
                  </Box>
                  <Text color={colors.textPrimary} fontSize="$xl" fontWeight="$bold">
                    Active Subscription
                  </Text>
                </HStack>

                {subscriptionStatus.billingPeriod && (
                  <Text color={colors.textSecondary} fontSize="$md">
                    Plan: Pro {subscriptionStatus.billingPeriod === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                  </Text>
                )}

                {subscriptionStatus.expiryDate && (
                  <Text color={colors.textSecondary} fontSize="$md">
                    Next billing: {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                  </Text>
                )}

                <PrimaryButton onPress={handleManageSubscription} variant="outline">
                  Manage Subscription
                </PrimaryButton>
              </VStack>
            </SectionCard>

            <VStack space="sm">
              <Text color={colors.textPrimary} fontSize="$lg" fontWeight="$semibold">
                Your Pro Features
              </Text>
              {features.map((feature, index) => (
                <ListItem
                  key={index}
                  icon={feature.icon}
                  title={feature.text}
                />
              ))}
            </VStack>
          </VStack>
        </ScrollView>
      </Box>
    );
  }

  // Main upgrade screen
  return (
    <Box flex={1} bg={colors.surfaceMuted}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <HeaderGradient
          greeting="Unlock Pro Features"
          name="👑"
          usageText="Unlimited ideas, unlimited possibilities"
          showUpgradeButton={false}
        />

        <VStack space="lg" px={space.lg} py={space.lg}>
          {/* Plan Selector */}
          <SegmentedTabs
            tabs={[
              { key: 'MONTHLY', label: 'Monthly' },
              { key: 'YEARLY', label: 'Yearly (Save 17%)' },
            ]}
            activeTab={selectedPlan}
            onTabChange={(key) => setSelectedPlan(key as 'MONTHLY' | 'YEARLY')}
          />

          {/* Pricing Cards */}
          <SectionCard>
            <VStack space="lg">
              <VStack space="xs" alignItems="center">
                <Text color={colors.textPrimary} fontSize="$3xl" fontWeight="$bold">
                  {getProductPrice(selectedPlan)}
                </Text>
                <Text color={colors.textSecondary} fontSize="$md">
                  per {selectedPlan === 'MONTHLY' ? 'month' : 'year'}
                </Text>
              </VStack>

              <VStack space="sm">
                {features.map((feature, index) => (
                  <HStack key={index} space="sm" alignItems="center">
                    <Box
                      bg={colors.brand[50]}
                      p={space.xs}
                      borderRadius={8}
                    >
                      <feature.icon color={colors.brand[600]} size={20} />
                    </Box>
                    <Text color={colors.textPrimary} fontSize="$md" flex={1}>
                      {feature.text}
                    </Text>
                  </HStack>
                ))}
              </VStack>

              <PrimaryButton
                onPress={handlePurchase}
                isLoading={isLoading}
                isDisabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Start Pro Subscription'}
              </PrimaryButton>

              <GhostPillButton
                onPress={handleRestorePurchases}
                isDisabled={isRestoring}
                variant="ghost"
              >
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </GhostPillButton>
            </VStack>
          </SectionCard>

          {/* Comparison Table */}
          <VStack space="md">
            <Text color={colors.textPrimary} fontSize="$xl" fontWeight="$semibold">
              Free vs Pro
            </Text>
            <SectionCard noPadding>
              <VStack>
                {comparisonData.map((item, index) => (
                  <Box
                    key={index}
                    px={space.md}
                    py={space.sm}
                    borderBottomWidth={index < comparisonData.length - 1 ? 1 : 0}
                    borderBottomColor={colors.borderMuted}
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text color={colors.textPrimary} fontSize="$sm" flex={1}>
                        {item.feature}
                      </Text>
                      <HStack space="xl" alignItems="center">
                        <Box width={60} alignItems="center">
                          {typeof item.free === 'boolean' ? (
                            item.free ? <Check color={colors.success} size={20} /> : <X color={colors.textSecondary} size={20} />
                          ) : (
                            <Text color={colors.textSecondary} fontSize="$sm">{item.free}</Text>
                          )}
                        </Box>
                        <Box width={60} alignItems="center">
                          {typeof item.pro === 'boolean' ? (
                            item.pro ? <Check color={colors.brand[600]} size={20} /> : <X color={colors.textSecondary} size={20} />
                          ) : (
                            <Text color={colors.brand[600]} fontSize="$sm" fontWeight="$semibold">{item.pro}</Text>
                          )}
                        </Box>
                      </HStack>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </SectionCard>
          </VStack>

          {/* Legal Text */}
          <Text color={colors.textSecondary} fontSize="$xs" textAlign="center">
            Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
            Manage your subscription in your account settings.
          </Text>
        </VStack>
      </ScrollView>
    </Box>
  );
}
