import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
} from "@gluestack-ui/themed";
import {
  ArrowLeft,
  Lightbulb,
  Target,
  Calendar,
  Download,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SegmentedTabs,
  SectionCard,
  ListItem,
  PrimaryButton,
  InlineNotice,
} from '@/components/ui';
import { space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';

export default function IdeaAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ideaId = params.id as string;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useThemedColors();

  const [activeTab, setActiveTab] = useState('canvas');
  const isPro = user?.subscriptionPlan === 'PRO';

  // Mock data - replace with actual API calls
  const canvasData = {
    problem: "Users struggle to validate and refine their business ideas effectively",
    targetAudience: "Entrepreneurs, startup founders, and innovators",
    valueProposition: "AI-powered idea validation and refinement platform",
    keyFeatures: ["Interactive AI chat", "Smart suggestions", "PDF exports"],
    monetization: "Freemium model with Pro subscription"
  };

  const scorecardData = [
    { metric: "Market Viability", score: 85, comment: "Strong market demand identified" },
    { metric: "Innovation Level", score: 75, comment: "Moderate innovation with AI integration" },
    { metric: "Feasibility", score: 90, comment: "High technical feasibility" },
    { metric: "Revenue Potential", score: 80, comment: "Good monetization opportunities" },
  ];

  const planData = [
    { day: 1, tasks: ["Research target market", "Define MVP features"] },
    { day: 2, tasks: ["Create wireframes", "Set up development environment"] },
    { day: 3, tasks: ["Build core features", "Implement authentication"] },
    { day: 4, tasks: ["Integrate AI", "Test functionality"] },
    { day: 5, tasks: ["Design UI/UX", "Implement feedback"] },
    { day: 6, tasks: ["Beta testing", "Bug fixes"] },
    { day: 7, tasks: ["Launch preparation", "Marketing materials"] },
  ];

  const handleExportPDF = () => {
    if (!isPro) {
      router.push({
        pathname: '/(app)/upgrade',
        params: { source: 'analysis_export_pdf' },
      });
      return;
    }
    // Implement PDF export
    alert('PDF export functionality - Coming soon!');
  };

  return (
    <Box flex={1} bg={colors.surfaceMuted}>
      {/* Header */}
      <Box px={space.lg} pt={insets.top + space.md} pb={space.md} bg={colors.surface}>
        <HStack space="md" alignItems="center">
          <Pressable onPress={() => router.back()} p={space.xs}>
            <ArrowLeft color={colors.textPrimary} size={24} />
          </Pressable>
          <Text fontSize="$xl" fontWeight="$bold" color={colors.textPrimary} flex={1}>
            Idea Analysis
          </Text>
        </HStack>
      </Box>

      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space="lg" px={space.lg} py={space.lg}>
          {/* Tab Selector */}
          <SegmentedTabs
            tabs={[
              { key: 'canvas', label: 'Canvas' },
              { key: 'scorecard', label: 'Scorecard' },
              { key: 'plan', label: '7-Day Plan' },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Pro Feature Notice */}
          {!isPro && (
            <InlineNotice
              type="info"
              title="Pro Feature"
              message="Upgrade to Pro to export your analysis as PDF"
              action={{
                label: 'Upgrade Now',
                onPress: () =>
                  router.push({
                    pathname: '/(app)/upgrade',
                    params: { source: 'analysis_quota_banner' },
                  }),
              }}
            />
          )}

          {/* Canvas Tab */}
          {activeTab === 'canvas' && (
            <VStack space="md">
              <SectionCard>
                <VStack space="md">
                  <HStack space="sm" alignItems="center">
                    <Lightbulb color={colors.brand[600]} size={20} />
                    <Text fontSize="$lg" fontWeight="$semibold" color={colors.textPrimary}>
                      Problem
                    </Text>
                  </HStack>
                  <Text fontSize="$sm" color={colors.textSecondary}>
                    {canvasData.problem}
                  </Text>
                </VStack>
              </SectionCard>

              <SectionCard>
                <VStack space="md">
                  <HStack space="sm" alignItems="center">
                    <Target color={colors.brand[600]} size={20} />
                    <Text fontSize="$lg" fontWeight="$semibold" color={colors.textPrimary}>
                      Target Audience
                    </Text>
                  </HStack>
                  <Text fontSize="$sm" color={colors.textSecondary}>
                    {canvasData.targetAudience}
                  </Text>
                </VStack>
              </SectionCard>

              <SectionCard>
                <VStack space="sm">
                  <Text fontSize="$lg" fontWeight="$semibold" color={colors.textPrimary}>
                    Key Features
                  </Text>
                  {canvasData.keyFeatures.map((feature, index) => (
                    <Text key={index} fontSize="$sm" color={colors.textSecondary}>
                      • {feature}
                    </Text>
                  ))}
                </VStack>
              </SectionCard>
            </VStack>
          )}

          {/* Scorecard Tab */}
          {activeTab === 'scorecard' && (
            <VStack space="md">
              {scorecardData.map((item, index) => (
                <SectionCard key={index}>
                  <VStack space="sm">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$md" fontWeight="$semibold" color={colors.textPrimary}>
                        {item.metric}
                      </Text>
                      <Box
                        bg={item.score >= 80 ? colors.successLight : colors.warningLight}
                        px={space.sm}
                        py={space.xxs}
                        borderRadius={12}
                      >
                        <Text
                          fontSize="$sm"
                          fontWeight="$bold"
                          color={item.score >= 80 ? colors.success : colors.warning}
                        >
                          {item.score}/100
                        </Text>
                      </Box>
                    </HStack>
                    <Text fontSize="$sm" color={colors.textSecondary}>
                      {item.comment}
                    </Text>
                  </VStack>
                </SectionCard>
              ))}
            </VStack>
          )}

          {/* Plan Tab */}
          {activeTab === 'plan' && (
            <VStack space="md">
              {planData.map((day) => (
                <SectionCard key={day.day}>
                  <VStack space="sm">
                    <HStack space="sm" alignItems="center">
                      <Calendar color={colors.brand[600]} size={20} />
                      <Text fontSize="$md" fontWeight="$semibold" color={colors.textPrimary}>
                        Day {day.day}
                      </Text>
                    </HStack>
                    {day.tasks.map((task, index) => (
                      <Text key={index} fontSize="$sm" color={colors.textSecondary}>
                        • {task}
                      </Text>
                    ))}
                  </VStack>
                </SectionCard>
              ))}
            </VStack>
          )}

          {/* Export Button */}
          <PrimaryButton
            onPress={handleExportPDF}
            isDisabled={!isPro}
          >
            <HStack space="xs" alignItems="center">
              <Download color="#FFFFFF" size={20} />
              <Text color="#FFFFFF" fontWeight="$bold">
                {isPro ? 'Export as PDF' : 'Upgrade to Export PDF'}
              </Text>
            </HStack>
          </PrimaryButton>
        </VStack>
      </ScrollView>
    </Box>
  );
}
