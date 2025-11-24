
# IdeaSpark — 2025 UI/UX Redesign Implementation Guide (React Native + Gluestack)

**Goal**: Replace the dated “ERP‑like” UI with a cohesive, modern, mobile‑native design system that scales across **Home**, **Upgrade/Paywall**, **Chats**, **Chat Detail**, **Profile/Settings**, **Auth**, and **Idea Analysis** (Canvas/Scorecard/7‑Day Plan), without changing your business logic or hooks.

This document is a **drop‑in implementation plan**. It specifies **folders, files, components, tokens, wiring points, and acceptance criteria**. You can implement it incrementally and track progress as a sprint.

> Targets: **iOS (iPhone X → 16 Pro Max)**, **Android 12+**, Expo + Gluestack.  
> Assumptions: Existing hooks/API stay (e.g., `useAuth`, `useIdeaSession`, `useSubscription`, `usePaywall`, `useToast`).  
> Offline: No offline mode. If `!isOnline`, show a banner and block AI actions.

---

## Table of Contents

1. [Dependencies](#1-dependencies)
2. [Project Structure](#2-project-structure)
3. [Theme Tokens & Gluestack](#3-theme-tokens--gluestack)
4. [UI Kit (Reusable Components)](#4-ui-kit-reusable-components)
5. [Screen Implementations](#5-screen-implementations)
    - [Home](#home)
    - [Upgrade / Paywall](#upgrade--paywall)
    - [Chats Index](#chats-index)
    - [Chat Detail](#chat-detail)
    - [Profile / Settings](#profile--settings)
    - [Auth (Login/Signup)](#auth-loginsignup)
    - [Idea Analysis (Canvas / Scorecard / 7‑Day Plan)](#idea-analysis-canvas--scorecard--7day-plan)
    - [PDF Export](#pdf-export)
6. [Hook Wiring & Gating](#6-hook-wiring--gating)
7. [State, Error & Network UX](#7-state-error--network-ux)
8. [Accessibility, Motion & Performance](#8-accessibility-motion--performance)
9. [Dark Mode](#9-dark-mode)
10. [QA Checklists & Definition‑of‑Done](#10-qa-checklists--definition-of-done)
11. [Rollout Plan (Sprints & Commits)](#11-rollout-plan-sprints--commits)
12. [Risks & Mitigations](#12-risks--mitigations)

---

## 1) Dependencies

Install once (Expo project):

```bash
# UI & icons
npm i @gluestack-ui/themed @gluestack-style/react lucide-react-native

# gradients, blur, haptics, safe area
npx expo install expo-linear-gradient expo-blur expo-haptics react-native-safe-area-context

# optional: animations & skeletons
npx expo install react-native-reanimated react-native-gesture-handler
npm i moti # optional

# networking status
npx expo install expo-network
```

> Ensure Gluestack is configured per docs. Reanimated must be added to `babel.config.js` if you enable animations.

---

## 2) Project Structure

```bash
src/
  theme/
    tokens.ts
    gluestack.config.ts           # extend with tokens (or import tokens.ts)
  components/
    ui/
      PrimaryButton.tsx
      GhostPillButton.tsx
      FilledInput.tsx
      FilledTextarea.tsx
      SelectableChip.tsx
      SectionCard.tsx
      FeatureCard.tsx
      ListItem.tsx
      SettingsRow.tsx
      ToggleRow.tsx
      EmptyState.tsx
      InlineNotice.tsx
      SegmentedTabs.tsx
      UsagePill.tsx
      ScrollToBottomFAB.tsx
      TypingDots.tsx
      ActionSheet.tsx
      HeaderGradient.tsx
  screens/
    home/HomeScreen.tsx
    upgrade/UpgradeScreen.tsx
    chat/ChatListScreen.tsx
    chat/ChatScreen.tsx
    profile/ProfileScreen.tsx
    auth/LoginScreen.tsx
    analysis/IdeaAnalysisScreen.tsx
  hooks/
    useNetworkStatus.ts
    useHaptics.ts
```

> Keep your existing `index.tsx` for navigation/providers and import these screens. Avoid business logic inside screen files.

---

## 3) Theme Tokens & Gluestack

**`src/theme/tokens.ts`**

```ts
export const colors = {
  brand: {
    50:  '#F1F1FF',
    100: '#E3E1FF',
    200: '#CAC5FF',
    300: '#A79FFF',
    400: '#7D70FF',
    500: '#6C63FF', // Primary
    600: '#5A54E6',
    700: '#4A45C7',
    800: '#3A36A8',
    900: '#2A288A',
  },
  surface: '#FFFFFF',
  surfaceMuted: '#F7F7FA',
  textPrimary: '#101114',
  textSecondary: '#555B66',
  borderMuted: '#E9EAF0',
};

export const radii = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28 };
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, '2xl': 40 };
export const shadows = {
  card: { shadowColor: '#0B0E14', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
};
export const type = {
  display: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  title:   { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  body:    { fontSize: 16, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
};
```

**`src/theme/gluestack.config.ts`** (sketch)

```ts
import { createConfig } from '@gluestack-ui/themed';
import { colors, radii, space } from './tokens';
export default createConfig({
  tokens: { colors, radii, space },
  // extend components if needed
});
```

**Principles**

- No heavy gray borders; **filled inputs** with hairline borders for focus.
- Cards use **soft shadow** + 16–20 radius; large titles; generous spacing.
- 1 clear **primary CTA** per screen; other actions use ghost/outline.
- 8‑pt grid: 20–24 outer padding; 12–16 inside groups.

---

## 4) UI Kit (Reusable Components)

> Build these once in `src/components/ui/` and reuse everywhere.

- **Buttons**: `PrimaryButton` (solid brand), `GhostPillButton` (outline, rounded)
- **Inputs**: `FilledInput`, `FilledTextarea` (tinted bg)
- **Chips**: `SelectableChip` (active filled, inactive outline)
- **Cards**: `SectionCard` (generic container), `FeatureCard` (icon + copy), `PlanTile` (price + features)
- **Lists**: `ListItem` (icon + title + caption), `SettingsRow` (chevron), `ToggleRow`
- **Feedback**: `EmptyState`, `InlineNotice` (success/warn/error), `TypingDots`
- **Overlays**: `ActionSheet` (bottom sheet/portal), `Toast` wrapper (can route to your `useToast`)
- **Misc**: `UsagePill`, `SegmentedTabs`, `ScrollToBottomFAB`, `HeaderGradient` (gradient with safe area)

**Example: PrimaryButton**

```tsx
// src/components/ui/PrimaryButton.tsx
import React from 'react';
import { Button, ButtonText } from '@gluestack-ui/themed';
export const PrimaryButton = ({ children, ...props }: any) => (
  <Button bg="$brand500" borderRadius="$xl" size="lg" {...props}>
    <ButtonText color="$white">{children}</ButtonText>
  </Button>
);
```

**Example: SelectableChip**

```tsx
// src/components/ui/SelectableChip.tsx
import React from 'react';
import { Pressable, Text } from '@gluestack-ui/themed';

export const SelectableChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    px="$3" py="$2"
    mr="$2" mb="$2"
    borderRadius="$2xl"
    borderWidth={1}
    borderColor={active ? '$brand300' : '$borderMuted'}
    bg={active ? '$brand50' : '$surface'}
  >
    <Text color={active ? '$brand700' : '$textPrimary'} fontWeight={active ? '$bold' : '$medium'}>{label}</Text>
  </Pressable>
);
```

---

## 5) Screen Implementations

### Home

**Files**
```
src/screens/home/HomeScreen.tsx
src/components/ui/HeaderGradient.tsx
src/components/ui/UsagePill.tsx
src/components/ui/FeatureCard.tsx
```

**UI**
- `HeaderGradient` (greeting + small usage text + **Upgrade** ghost pill)
- `SectionCard` → “Describe your idea” with **Category chips**, **Title**, **Description**, **Example chips**, **Primary CTA**
- `FeatureCard` list: “Talk through your ideas” / “Get sharper opportunities”

**Behavior**
- Disable CTA if description empty or `!isOnline`.
- Show `UsagePill` (“1 free idea · 2 replies total”) for Free.

**Navigation**
- On submit: call `useIdeaSession.startMiniFlow` or your existing start, then `navigate('Chat')` or `IdeaAnalysis`.
  
---

### Upgrade / Paywall

**File**
```
src/screens/upgrade/UpgradeScreen.tsx
```

**UI**
- `HeaderGradient` + crown icon, 1‑sentence value prop
- `SegmentedTabs`: Monthly / Yearly
- Two `PlanTile`s with price & features; yearly highlighted
- `Comparison` section (Free vs Pro) as concise rows
- Footer: `GhostPillButton` “Restore Purchases”, legal copy

**Behavior**
- Button → `useSubscription.purchasePro()`
- Restore → `restorePurchases()`
- If user is Pro → show badge + disable purchase

**Acceptance**
- Sticky bottom CTA (safe‑area aware), real store prices loaded, latency states handled.

---

### Chats Index

**File**
```
src/screens/chat/ChatListScreen.tsx
```

**UI**
- Header “Conversations”
- If empty: `EmptyState` with CTA “Create Your First Idea”
- Else: `FlatList` of `ConversationItem` (card row: title, last message preview, timestamp, usage)

**Behavior**
- Pull‑to‑refresh; skeletons while loading
- Tap → `ChatScreen` with `chatId`

**Performance**
- `getItemLayout`, `removeClippedSubviews`, stable keys

---

### Chat Detail

**File**
```
src/screens/chat/ChatScreen.tsx
```

**UI**
- Header with truncated idea title + overflow menu
- Messages: `MessageBubble` (user/assistant variants)
- Composer: borderless input + send, `TypingDots` when waiting
- Inline `InlineNotice` for **quota reached** with mini upgrade CTA

**Behavior**
- If `!isOnline` → offline banner, disable send
- If Free & out of replies → disable send, show `InlineNotice`, open paywall on CTA
- Long press message → Copy / Retry (if failed)

**Performance**
- Virtualized list; keep message items memoized

---

### Profile / Settings

**File**
```
src/screens/profile/ProfileScreen.tsx
```

**UI**
- Avatar + name + **Plan badge**
- `SectionCard` groups:
  - Account: Manage Subscription/Restore, Change Password
  - Preferences: Dark Mode, Notifications, Marketing Emails
  - Support: FAQ, Contact Support
  - Danger: Delete Account (destructive)

**Behavior**
- Manage/Restore → `useSubscription`
- Delete → confirm sheet → backend call (stub ok)

---

### Auth (Login/Signup)

**File**
```
src/screens/auth/LoginScreen.tsx
```

**UI**
- Large headline, two `FilledInput`s with icons
- `PrimaryButton` Sign In
- “Continue with” SSO buttons
- Footer: “By continuing…” legal text

**Behavior**
- KeyboardAvoidingView; inline errors; `useAuth.signIn/signUp`

---

### Idea Analysis (Canvas / Scorecard / 7‑Day Plan)

**File**
```
src/screens/analysis/IdeaAnalysisScreen.tsx
```

**UI**
- `SegmentedTabs`: Canvas / Scorecard / Plan
- Canvas: `SectionHeader` + `FieldRow` lists (Problem, Target, Value, Key Features, Monetization)
- Scorecard: 3–4 metric rows with score badges + comments; overall score chip
- Plan: Day 1 → Day 7 list with 1–3 tasks/day
- Pro actions: **Save**, **Export PDF** (for saved session)

**Behavior**
- Data comes from `generateFullFlow`
- “Export PDF” → backend `POST /idea/:id/export-pdf` → `ActionSheet` to Share

---

### PDF Export

**Interaction**
- Tapping **Export PDF**: show `ActionSheet` with “Generating…” and progress. On success, open share sheet with URL.

---

## 6) Hook Wiring & Gating

- **useAuth** → header name; profile email; logout; delete.
- **useSubscription** → `plan` & `isPro` gating; `purchasePro`, `restorePurchases`.
- **useIdeaSession** → Start flows (`startMiniFlow` / `startFullFlow`), messages (`sendFollowup`), remaining replies.
- **usePaywall** → `openPaywall('free_limit_reached')` from Chat composer or Full‑flow button.
- **useNetworkStatus** → gate CTAs; show offline banner.
- **useToast** → global success/error messages.

**Gating examples**
- Home: Full Plan button → if Free and no trial → open paywall.
- Chat: `canSendMessage` false → inline upgrade notice + disabled composer.

---

## 7) State, Error & Network UX

- **Loading**: skeletons for lists/cards; CTA shows spinner & becomes disabled during actions.
- **Errors**: inline small `InlineNotice` below input or in card; toast for non‑field errors.
- **Network**: top sticky offline banner; disable AI actions.
- **Rate limit**: show “You’re asking too fast” notice if backend returns 429.
- **Quota**: 403 with `{ code: 'FREE_MESSAGE_LIMIT_REACHED' | 'FREE_IDEA_LIMIT_REACHED' }` → open paywall + inline notice.

---

## 8) Accessibility, Motion & Performance

- Touch targets ≥ **44pt**. Color contrast ≥ **4.5:1**.
- VoiceOver labels on all interactive rows; meaningful `accessibilityHint` on paywall CTAs.
- Motion: subtle press scale (0.98); haptics on primary actions.
- Virtualized lists for chats; memoize `MessageBubble`; avoid inline anonymous functions in large lists.
- Defer heavy images/icons; prefetch fonts if using custom.

---

## 9) Dark Mode

- Add a dark palette in `tokens.ts` (`surface`, `surfaceMuted`, `textPrimary/Secondary`, `borderMuted`).  
- Keep `brand500` as brand (or provide `brand300` for dark).  
- Test every screen for contrast & shadow fallbacks (Android elevation).

---

## 10) QA Checklists & Definition‑of‑Done

**Global DoD**
- No heavy borders remain; only filled inputs and soft cards.
- One clear primary CTA per screen; ghost/outline for secondary.
- Online/offline, loading, error, empty states all handled.
- Free vs Pro gating cannot be bypassed from UI.

**Home**
- Category chips scroll; examples prefill; CTA disabled until valid.
- Usage pill shows correct counts.

**Upgrade**
- Prices from store; restore works; yearly default selected; legal copy visible.

**Chats Index**
- Empty state appears when 0 items; list stable at 60fps; timestamps correct.

**Chat Detail**
- Send disabled when limit reached; inline upgrade visible; copy message works.

**Profile**
- Manage subscription opens platform; Delete account flow has confirm sheet.

**Auth**
- Keyboard safe; SSO buttons; errors clear and inline.

**Analysis**
- Tabs switch instantly; scores formatted; PDF export works or shows reason.

---

## 11) Rollout Plan (Sprints & Commits)

**Sprint A — Foundation (1–2 days)**
- Add `tokens.ts`, wire Gluestack config.
- Build UI Kit: `PrimaryButton`, `FilledInput`, `SelectableChip`, `SectionCard`, `ListItem`.

**Sprint B — Home & Upgrade (1–2 days)**
- Refactor Home using kit; integrate network/usage gating.
- Implement Upgrade screen with `PlanTile`, `BenefitList`, “Restore”.

**Sprint C — Chat (2–3 days)**
- Chat Detail: `MessageBubble`, `Composer`, `TypingDots`, inline paywall.
- Chats Index: empty state + list item + skeletons.

**Sprint D — Profile & Auth (1–2 days)**
- Profile sections; settings rows; danger zone.
- Auth screen cleanup; keyboard handling; error states.

**Sprint E — Analysis & PDF (2 days)**
- Tabs (Canvas/Scorecard/Plan), score & list components.
- PDF export flow & share sheet.

**Sprint F — Polish (ongoing)**
- Dark mode, motion, accessibility, performance tuning.

---

## 12) Risks & Mitigations

- **Visual drift**: enforce tokens + kit only (no ad‑hoc styles). Code review for this.
- **Performance regressions**: memoize list items; test large chats; use profiler.
- **Android shadows**: ensure `elevation` is set on cards; test on mid‑range device.
- **Store pricing load**: show skeletons / fallback copy until prices load.
- **Localization** (future): avoid hardcoded strings; centralize in `i18n` soon.

---

## Appendices

### A) Example: HeaderGradient

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Box, HStack, VStack, Text, Button, ButtonText } from '@gluestack-ui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HeaderGradient = ({ name, usageText, onUpgrade }: { name: string; usageText?: string; onUpgrade: () => void }) => {
  const insets = useSafeAreaInsets();
  return (
    <Box>
      <LinearGradient
        colors={['#F6F7FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        <HStack alignItems="center" justifyContent="space-between">
          <VStack>
            <Text color="$textSecondary" fontSize={13}>Good evening,</Text>
            <Text style={{ fontSize: 28, fontWeight: '700' }}>{name}</Text>
            {!!usageText && <Text color="$textSecondary" fontSize={13}>{usageText}</Text>}
          </VStack>
          <Button variant="outline" borderColor="$brand500" borderRadius="$xl" onPress={onUpgrade}>
            <ButtonText color="$brand700">UPGRADE</ButtonText>
          </Button>
        </HStack>
      </LinearGradient>
    </Box>
  );
};
```

### B) Example: MessageBubble

```tsx
import { Box, Text } from '@gluestack-ui/themed';
export function MessageBubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <Box
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxWidth="86%"
      bg={isUser ? '$brand600' : '$surfaceMuted'}
      borderRadius="$xl"
      px="$4" py="$3"
      style={{ borderTopRightRadius: isUser ? 4 : 20, borderTopLeftRadius: isUser ? 20 : 4 }}
    >
      <Text color={isUser ? '$white' : '$textPrimary'}>{children}</Text>
    </Box>
  );
}
```

---

### C) How to adopt without breaking logic

- Keep all API/hook calls as‑is. Replace the **view layer only**.
- If a screen grows, move only **UI bits** to `components/ui/` or `screens/*/components`—not business logic.
- Run through the **DoD** in §10 after each screen to keep quality consistent.

---

**That’s it.** This guide gives you a consistent system, code scaffolding, and acceptance criteria to modernize IdeaSpark’s UI end‑to‑end with minimal risk and high velocity.
