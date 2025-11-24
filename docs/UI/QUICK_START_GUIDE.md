# IdeaSpark 2025 UI Redesign - Quick Start Guide

**For developers working with the new design system**

---

## 🚀 Getting Started

### Import Components
```tsx
import {
  PrimaryButton,
  FilledInput,
  SectionCard,
  HeaderGradient,
  InlineNotice,
  // ... etc
} from '@/components/ui';
```

### Import Design Tokens
```tsx
import { colors, space, radii, shadows } from '@/theme/tokens';
```

---

## 📦 Component Quick Reference

### Buttons

**Primary CTA:**
```tsx
<PrimaryButton
  onPress={handlePress}
  isLoading={loading}
  isDisabled={disabled}
>
  Button Text
</PrimaryButton>
```

**Secondary Action:**
```tsx
<GhostPillButton
  onPress={handlePress}
  variant="outline" // or "ghost"
  size="sm" // or "md"
>
  Button Text
</GhostPillButton>
```

---

### Forms

**Text Input:**
```tsx
<FilledInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="your@email.com"
  icon={Mail}
  error={errors.email}
  isRequired
  keyboardType="email-address"
/>
```

**Textarea:**
```tsx
<FilledTextarea
  label="Description"
  value={description}
  onChangeText={setDescription}
  placeholder="Enter description..."
  maxLength={500}
  numberOfLines={4}
  error={errors.description}
/>
```

**Chips:**
```tsx
<SelectableChip
  label="Option"
  active={selected === 'option'}
  onPress={() => setSelected('option')}
/>
```

---

### Layout

**Section Card:**
```tsx
<SectionCard>
  <VStack space={space.md}>
    <Text>Content here</Text>
  </VStack>
</SectionCard>
```

**Header:**
```tsx
<HeaderGradient
  greeting="Good Evening"
  name={user.name}
  usageText="Optional usage info"
  onUpgrade={() => router.push('/upgrade')}
  showUpgradeButton={!isPro}
/>
```

---

### Lists & Navigation

**List Item:**
```tsx
<ListItem
  icon={MessageCircle}
  title="Item Title"
  caption="Optional subtitle"
  rightElement={<Text>Info</Text>}
  onPress={handlePress}
/>
```

**Settings Row:**
```tsx
<SettingsRow
  icon={Bell}
  label="Notifications"
  value="Enabled"
  onPress={handlePress}
/>
```

**Toggle Row:**
```tsx
<ToggleRow
  icon={Moon}
  label="Dark Mode"
  description="Optional description"
  value={darkMode}
  onValueChange={setDarkMode}
/>
```

---

### Feedback

**Inline Notice:**
```tsx
<InlineNotice
  type="warning" // or "info", "success", "error"
  title="Optional Title"
  message="Message text"
  action={{
    label: "Action",
    onPress: handleAction
  }}
  onDismiss={handleDismiss}
/>
```

**Empty State:**
```tsx
<EmptyStateNew
  icon={Lightbulb}
  title="No Items"
  description="Add your first item to get started"
  action={{
    label: "Add Item",
    onPress: handleAdd
  }}
/>
```

**Usage Pill:**
```tsx
<UsagePill
  text="Pro Member"
  variant="pro" // or "default", "warning"
/>
```

---

### Navigation

**Segmented Tabs:**
```tsx
<SegmentedTabs
  tabs={[
    { key: 'tab1', label: 'Tab 1' },
    { key: 'tab2', label: 'Tab 2' }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

---

### Chat

**Message Bubble:**
```tsx
<MessageBubble
  role="user" // or "assistant"
  timestamp="5m ago"
>
  Message content here
</MessageBubble>
```

**Typing Indicator:**
```tsx
<TypingDots />
```

---

### Feature Display

**Feature Card:**
```tsx
<FeatureCard
  icon={Sparkles}
  title="Feature Title"
  description="Feature description"
  onPress={handlePress} // optional
/>
```

---

## 🎨 Design Tokens

### Colors
```tsx
// Brand
colors.brand[50] to colors.brand[900]
colors.brand[500] // Primary

// Semantic
colors.surface          // #FFFFFF
colors.surfaceMuted     // #F7F7FA
colors.textPrimary      // #101114
colors.textSecondary    // #555B66
colors.borderMuted      // #E9EAF0
colors.success          // #10B981
colors.warning          // #F59E0B
colors.error            // #EF4444
```

### Spacing
```tsx
space.xxs  // 4px
space.xs   // 8px
space.sm   // 12px
space.md   // 16px
space.lg   // 24px
space.xl   // 32px
space['2xl'] // 40px
```

### Border Radius
```tsx
radii.xs    // 8px
radii.sm    // 12px
radii.md    // 16px
radii.lg    // 20px
radii.xl    // 28px
radii['2xl'] // 36px
```

### Shadows
```tsx
shadows.card  // Standard card shadow
shadows.sm    // Small shadow
shadows.lg    // Large shadow
```

---

## 📱 Common Patterns

### Screen Template
```tsx
export default function MyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();

  return (
    <Box flex={1} bg={colors.surfaceMuted}>
      <HeaderGradient
        name={user?.name}
        greeting="Screen Title"
      />

      <ScrollView px={space.lg} py={space.lg}>
        <VStack space={space.lg}>
          {!isOnline && (
            <InlineNotice
              type="warning"
              message="You're offline"
            />
          )}

          <SectionCard>
            {/* Content here */}
          </SectionCard>
        </VStack>
      </ScrollView>
    </Box>
  );
}
```

### Form Pattern
```tsx
<SectionCard>
  <VStack space={space.lg}>
    <FilledInput
      label="Field 1"
      value={field1}
      onChangeText={setField1}
      error={errors.field1}
    />

    <FilledInput
      label="Field 2"
      value={field2}
      onChangeText={setField2}
      error={errors.field2}
    />

    <PrimaryButton
      onPress={handleSubmit}
      isLoading={loading}
      isDisabled={!canSubmit}
    >
      Submit
    </PrimaryButton>
  </VStack>
</SectionCard>
```

### Settings Pattern
```tsx
<SectionCard noPadding>
  <VStack>
    <SettingsRow icon={Icon1} label="Option 1" onPress={handle1} />
    <Divider bg={colors.borderMuted} />
    <SettingsRow icon={Icon2} label="Option 2" onPress={handle2} />
    <Divider bg={colors.borderMuted} />
    <Box px={space.md}>
      <ToggleRow
        label="Toggle Setting"
        value={enabled}
        onValueChange={setEnabled}
      />
    </Box>
  </VStack>
</SectionCard>
```

---

## ⚡ Quick Tips

1. **Always use design tokens** - No hardcoded colors/spacing
2. **One primary button per screen** - Secondary actions use GhostPillButton
3. **Check network status** - Use `useNetworkStatus()` hook
4. **Handle errors inline** - Use InlineNotice for contextual errors
5. **Show loading states** - Use `isLoading` prop on buttons
6. **Gate pro features** - Check `user?.subscriptionPlan === 'PRO'`
7. **Use SectionCard** - Wrap content in cards for consistency
8. **Follow 8pt grid** - Use `space.*` tokens for all spacing

---

## 🔍 Where to Find Things

**Components:** `/components/ui/`
**Design Tokens:** `/theme/tokens.ts`
**Hooks:** `/hooks/useNetworkStatus.ts`, `/hooks/useHaptics.ts`
**Example Screens:** Any `app/(app)/*.tsx` file
**Documentation:** `/docs/UI/`

---

## 🆘 Troubleshooting

**Import errors?**
- Make sure path is `@/components/ui` (with alias)
- Check component is exported in `components/ui/index.ts`

**Colors not working?**
- Import from `@/theme/tokens`
- Use token names like `colors.brand[500]`

**Spacing looks wrong?**
- Use `space.*` tokens, not hardcoded numbers
- Follow 8pt grid (xxs, xs, sm, md, lg, xl, 2xl)

**Component not rendering?**
- Check all required props are provided
- Verify children content is not undefined
- Check for TypeScript errors

---

## 📚 Full Documentation

- **Complete Implementation:** `FINAL_IMPLEMENTATION_SUMMARY.md`
- **Sprint A Details:** `SPRINT_A_IMPLEMENTATION_SUMMARY.md`
- **Sprints B-F Guide:** `IMPLEMENTATION_SUMMARY_SPRINTS_B_TO_F.md`

---

**Happy coding! 🚀**
