# IdeaSpark UI/UX Alignment – Current Status

This file reflects the *actual* state of the UI/UX implementation as of this audit and is intended to stay in sync with the codebase, not with earlier gradient/glassmorphism design docs.

## Completed UI/UX Work (Current Code)

- **Simplified, app-like visual language**
  - Login (`app/(auth)/index.tsx`), Home (`app/(app)/index.tsx`), Chat (`app/(app)/chats/[id].tsx`), Profile (`app/(app)/profile.tsx`), and Upgrade (`app/(app)/upgrade.tsx`) now use flat, card-based layouts rather than full-screen gradients and heavy glassmorphism.
  - Shared primitives in `components/ui` (`SectionCard`, `FilledInput`, `FilledTextarea`, `PrimaryButton`, `SelectableChip`, `InlineNotice`, `UsagePill`, `SettingsRow`, `ToggleRow`, `ListItem`, etc.) provide a consistent, calm, Bear-like feel.

- **Auth flow**
  - Single, focused auth screen (`app/(auth)/index.tsx`) with:
    - One primary card (`SectionCard`) for all modes (login / signup / forgot).
    - Clean inputs (`FilledInput`) with clear validation and inline errors.
    - A single primary action (`PrimaryButton`) and lightweight text links for mode switching.
  - Auth is wired to Supabase Auth and analytics:
    - `trackLogin('email')` and `trackSignup({ method: 'email' })` are called on successful auth.

- **Home / Idea creation**
  - Home uses a simple header (`HeaderGradient`) plus one main creation card:
    - Category selection via `SelectableChip` pills.
    - Title and description via `FilledInput`/`FilledTextarea`.
    - One clear CTA: “Refine My Idea with AI ✨”.
  - Usage + upgrade prompts are surfaced via `UsagePill` and `InlineNotice`, avoiding visual clutter.

- **Chat**
  - Chat detail screen displays the idea summary in a `SectionCard`, with clean `MessageBubble` components for user/assistant roles and a subtle typing indicator (`TypingDots`).
  - Input area uses a minimal `FilledTextarea` + `PrimaryButton`, with quota and connectivity notices via `InlineNotice`.

- **Profile**
  - Profile screen groups content into `SectionCard`s using `SettingsRow` and `ToggleRow` for:
    - Account (manage subscription / upgrade, change password, delete account).
    - Preferences (dark mode, push notifications, marketing emails, usage analytics).
    - Support and danger zone sections.
  - “Usage analytics” toggle is wired to the analytics consent flag (`analyticsConsent` in AsyncStorage) through `useAnalytics.setUserConsent`.

- **Upgrade / IAP**
  - Upgrade screen uses:
    - A compact hero (`HeaderGradient`) plus `SegmentedTabs` for Monthly vs Yearly.
    - A single pricing `SectionCard` with a concise feature list and strong primary CTA.
    - A “Free vs Pro” comparison table built with the same `SectionCard` + tokenized typography.
  - IAP flows are implemented via `services/iapService` and backend subscription APIs; UI copy reflects native App Store / Google Play purchases (no web checkout language).

## UI/UX Tasks Still Open or Partially Done

- **Design documentation drift**
  - `UI_REDESIGN_SUMMARY.md` still describes a gradient-heavy, glassmorphism-first design that no longer matches the app.
  - Action: **Rewrite `UI_REDESIGN_SUMMARY.md` to describe the current flat, card-based system and the `components/ui` primitives, or clearly mark the old design as deprecated.**

- **Dark mode**
  - `ThemeContext` + `useThemedColors` now drive a real dark/light theme across core screens (Auth, Home, Chat, Profile, Upgrade), and Profile’s “Dark Mode” toggle updates both local storage and backend user preferences.
  - Action: **Do a final visual pass in dark mode (especially banners, pills, and secondary text) to catch any remaining low‑contrast edge cases.**

- **Accessibility**
  - Auth has reasonably good labeling and error messaging; other screens are only partially labeled.
  - Action: **Perform a full VoiceOver/TalkBack pass on Home, Chat, Upgrade, and Profile; add `accessibilityRole`, `accessibilityLabel`, and hints where missing.**

- **Visual consistency and polish**
  - New screens mostly use the `components/ui` set, but some Gluestack primitives (`Box`, `Text`, `Pressable`) still mix ad‑hoc props instead of shared styles.
  - Action: **Standardize typography, spacing, and colors via tokens and the `ui` primitives (e.g., ensure headings use the same sizes/weights across Home, Chat, Profile, Upgrade).**

- **Micro-interactions**
  - Press states and animations are minimal compared to the original design intent.
  - Action: **Introduce subtle, consistent interactions (press feedback on primary buttons, chips, list items) without reintroducing visual noise.**

- **Legacy auth surface (backend only)**
  - Node email/password auth routes under `/api/v1/auth/*` and related tests remain in the codebase for legacy/utility use, but the app uses Supabase Auth exclusively.
  - Action: **Document these as legacy in backend docs and keep them out of client-facing flows to avoid confusion.**

## Next Steps for Alignment

1. **End-to-end UX review on device**
   - Run through auth → idea creation → chat → profile → upgrade on iOS and Android.
   - Log any visual or behavioral inconsistencies (spacing, typography, button hierarchy).

2. **Update design docs**
   - Bring `UI_REDESIGN_SUMMARY.md` in line with the current, calmer UI and the `components/ui` design system.
   - Keep this `docs/todo_list.md` in sync as the source of truth for what is actually implemented.

3. **Finalize core UX polish**
   - Implement working dark mode.
   - Complete accessibility pass.
   - Add a small, consistent set of micro-interactions (press feedback, maybe light haptics on key actions) to make the app feel premium without becoming visually noisy.
