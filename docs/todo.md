# IdeaSpark Full-Stack Delivery Plan

This to-do list expands the `docs/FullStackDevPlan.md` strategy combined with the existing Expo screens under `app/`. Tasks are ordered sequentially—finish them in order without skipping so dependencies are satisfied—and every frontend-impacting step must be verified on both iOS and Android simulators/devices before moving on.

## Phase 0 – Baseline & Tooling

1. **Verify Runtime & Install Dependencies**
   - Run `npm install` in repo root and ensure Expo SDK 54 CLI tools are available.
   - Execute `npm run start` once to confirm Metro bundles and the current screens load.
2. **Shared Configuration**
   - Create `.env.example` with keys: `API_URL`, `OPENAI_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`.
   - Add `.env` loading in Expo (`app.config.js` or `expo-env.d.ts`) and backend (using `dotenv` in `server` entry point).
3. **Code Quality & Automation**
   - Configure ESLint for monorepo (root config referencing Expo + Node rules) and ensure `npm run lint` covers both workspaces.
   - Set up Jest for backend + React Native Testing Library for frontend; create base tests (`__tests__/smoke.test.tsx`, `server/tests/health.test.ts`).
   - Add GitHub Action workflow: install deps → lint → test (both client/server jobs) on every PR.
4. **Shared Types Package**
   - Create `/packages/types` exporting DTOs (e.g., `Idea`, `IdeaMessage`, `UsageSummary`).
   - Configure `tsconfig.json` paths in both client/server to reference `@ideaspark/types`.
5. **Observability Baseline**
   - Select error-monitoring provider (e.g., Sentry) for both Expo and backend; install SDKs but keep instrumentation disabled until later phases need them.
   - Define log level conventions (debug/info/warn/error) and create shared logger utility wrappers (frontend console proxy, backend pino) for consistent formatting.
   - Document log retention expectations and redaction rules (no PII in logs).
6. **Testing & CI/CD Validation**
   - Add npm scripts `test:client`, `test:server`, `lint:client`, `lint:server` so CI jobs can call them individually.
   - Configure GitHub Actions caching for `node_modules`/`~/.cache/expo` to speed pipelines; ensure workflow fails fast on lint/test errors.
   - Set up status badges (CI + coverage) in `README.md` once workflows are green.
7. **Cross-Platform Baseline**
   - Configure `app.json`/`app.config.ts` with proper bundle identifiers, package names, icons, splash assets for both iOS and Android.
   - Run `npx expo run:ios` and `npx expo run:android` (simulators) to ensure native projects generate cleanly before deeper work begins.
   - Document any platform-specific quirks discovered so later phases can account for them.

## Phase 1 – Backend Foundations (Offline/Hybrid)

1. **Scaffold Server Project**
   - Create `/server` with `package.json`, TypeScript config, `src/index.ts` bootstrapping Express.
   - Install base deps: `express`, `cors`, `helmet`, `morgan`, `zod`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `pino`, `express-rate-limit`.
   - Install dev deps: `ts-node-dev`, `typescript`, `@types/*` packages, Jest + Supertest.
2. **Database Layer**
   - Add Prisma (`npx prisma init`) targeting Postgres.
   - Define schema with models: `User`, `RefreshToken`, `PasswordResetToken`, `IdeaSession`, `IdeaMessage`, `Subscription`, `AIUsageLog`, `MarketingAttribution`.
   - Include enums for `PlanTier`, `MessageSender`.
   - Run `npx prisma migrate dev --name init` and commit generated SQL.
   - Create `prisma/seed.ts` to insert demo users/ideas for local testing.
3. **Local Infrastructure**
   - Author `docker-compose.yml` for Postgres + Redis + Mailhog (email testing) with volumes and health checks.
   - Document `npm run dev:server` command that boots docker services then runs `ts-node-dev src/index.ts`.
4. **Core Middleware**
   - Implement `src/config.ts` reading environment variables with validation (zod).
   - Add global middlewares: security headers (helmet), CORS config (allow Expo dev host), JSON body parser with size limit, request logging (pino).
   - Create central `errorHandler` returning normalized JSON error responses.
5. **Auth & Session Endpoints**
   - Build services for hashing passwords, issuing access/refresh tokens, persisting refresh tokens with device fingerprint.
   - Endpoints:
     - `POST /auth/register` (email verification pending → return tokens immediately for MVP).
     - `POST /auth/login`.
     - `POST /auth/logout` (invalidate refresh token).
     - `POST /auth/refresh`.
     - `POST /auth/forgot-password` (generate token, send email via stub provider).
     - `POST /auth/reset-password`.
   - Implement `GET /me` returning profile + plan tier.
6. **Idea + Message APIs (stubbed AI)**
   - `POST /ideas`: create session with initial prompt, enforce one active idea for free tier.
   - `GET /ideas/:id/messages`: list conversation history sorted by creation date.
   - `POST /ideas/:id/messages`: accept user message, append to DB, **stub** AI response (random template) and store; return combined pair.
   - `GET /usage/summary`: aggregate replies remaining, total tokens (0 until real AI), plan tier, and session counts.
7. **Validation & Security**
   - Use zod schemas per endpoint; reject invalid payloads with descriptive errors consumed by Expo app.
   - Rate limit auth and message endpoints; add brute-force protection for login.
8. **Logging & Error Capture**
   - Configure pino (JSON logger) with request/response interceptors capturing correlation IDs and user IDs for every backend request.
   - Integrate Sentry (or chosen provider) in Express app to capture unhandled exceptions and rejected promises; ensure DSN configurable per environment.
   - Create middleware for structured error responses that also log stack traces while redacting sensitive data.
9. **Testing & CI/CD Focus**
   - Write Jest/Supertest suites for auth endpoints (register/login/logout/refresh) and idea routes (create idea, list messages, stub reply) with mocked DB via Prisma test client.
   - Add unit tests for `config`, `errorHandler`, logging utilities, and token services to guarantee coverage of failure paths.
   - Update CI workflow to spin up Postgres via services for backend test job; run `prisma migrate deploy` before tests.

## Phase 2 – Frontend Auth & State Wiring

1. **Auth Context**
   - Create `contexts/AuthContext.tsx` managing access/refresh tokens via `AsyncStorage`, exposing `signIn`, `signOut`, `refresh`, `bootstrap`.
   - Update `_layout.tsx` to wrap Stack with `AuthProvider` + `GluestackUIProvider` (added later) and to show splash while `bootstrap` runs.
2. **Route Guards**
   - Use Expo Router groups: `(auth)` for `/auth`, `(app)` for `/`, `/chat`, `/profile`, `/upgrade`. Redirect based on context state.
3. **API Client**
   - Create `lib/api.ts` (axios/fetch wrapper) that injects tokens and handles refresh on 401.
   - Define typed hooks (`useIdeas`, `useChat`, `useUsage`) leveraging SWR or React Query.
4. **Screen Wiring**
   - `app/auth.tsx`: replace console stubs with API calls, show server errors, handle forgot-password mode via backend.
   - `app/index.tsx`: on submit, call `POST /ideas`, navigate to `/chat?id=...` on success, handle errors (quota reached -> show upgrade prompt).
   - `app/chat.tsx`: fetch session messages via query param, poll or subscribe for updates, send messages via API, update local state from response payload.
   - `app/profile.tsx`: fetch `/me` on mount, display plan tier, tie logout button to `signOut`.
   - Ensure bottom nav buttons call `router.push('/chat')`, etc., rather than placeholders.
5. **Routing & Domain Structure Cleanup**
   - Replace the current “flat app” file layout with Expo Router groups per domain: `app/(auth)/index.tsx`, `app/(app)/ideas/index.tsx`, `app/(app)/chat/index.tsx`, `app/(app)/profile/index.tsx`, `app/(app)/upgrade/index.tsx`, plus group-level `_layout.tsx` files for shared headers/tabs.
   - Update imports and navigation to respect the new structure, ensuring relative paths are corrected and TypeScript paths updated.
   - Move shared UI/state utilities (e.g., bottom nav) into `/components/` and reference from domain screens to avoid duplication.
   - Verify routing by running `npx expo start --clear` and navigating through every screen to ensure no file-not-found or route mismatch errors.
6. **Error Logging & Debugging Hooks**
   - Integrate Sentry (or chosen provider) into Expo entry point with release/environment tags; wrap root navigation with error boundary capturing UI exceptions.
   - Create reusable `useLogger` hook that forwards console warnings/errors to the monitoring service in production builds.
   - Implement global toast/snackbar for surfaced errors so every screen’s API call uses consistent messaging.
7. **User-Facing Messages & Copy Catalog**
   - Define standardized copy for common states and wire them into a localization/constants file:
     - Auth errors: `"We couldn't sign you in. Check your email and password and try again."`
     - Validation warning for empty fields: `"Please fill out all required fields before continuing."`
     - Success info for password reset: `"If an account exists for {{email}}, we've sent reset instructions."`
     - Network fallback: `"We're having trouble connecting. Please check your internet connection and retry."`
   - Display upgrade reminder toast when free users exhaust ideas: `"You're out of free AI replies. Upgrade to keep brainstorming."`
   - Document placement (modals vs inline text) for each message so designers/developers stay consistent.
7. **Testing & CI/CD Focus**
   - Create React Native Testing Library specs for Auth screen (form validation, forgot-password flow), Home screen (button disabled states), Chat screen (message rendering), Profile screen (logout button), and navigation between grouped routes.
   - Mock API layer in tests with MSW or jest mocks to simulate success/error responses.
   - Extend CI workflow with Expo unit tests (using `expo-module-scripts test`) and ensure coverage threshold (e.g., 80%) enforced.
8. **iOS & Android Verification**
   - After completing this phase, run `npx expo run:ios` and `npx expo run:android`, walking through auth → idea submission → chat → profile flows to ensure parity.
   - Capture screenshots or notes of any platform-specific adjustments needed and create follow-up tasks before progressing to Phase 3.

## Phase 3 – Gluestack UI Migration

1. **Installation & Provider**
   - Install: `@gluestack-style/react`, `@gluestack-ui/themed`, `@gluestack-ui/icons`, `@expo/vector-icons` peer if needed.
   - Generate `gluestack-ui.config.ts` with brand colors (`gs.colors.primary = #8BC34A`, `secondary = #FF9800`, `info = #03A9F4`), fonts (Inter), radii tokens.
   - Wrap app root in `<GluestackUIProvider config={config}>` and remove unused Tailwind global styles where replaced.
2. **Component Refactors**
   - Auth Screen: use `<VStack>`, `<Heading>`, `<FormControl>`, `<Input>`, `<Button>`, `<IconButton>` for password toggle, `<Alert>` for info messages.
   - Home Screen: rebuild header with `<HStack>` + `<Badge>`, idea card with `<Card>` + `<Textarea>`, info section using `<SimpleGrid>` and `<Stat>` components.
   - Chat Screen: compose bubbles with `<Box>` + theming tokens, `<ActionIcon>` for thumbs/regenerate, `<TextArea>` for input, `<Spinner>` for pending state.
   - Profile Screen: `<Avatar>`, `<ListItem>`, `<Switch>`, `<Divider>`, `<Accordion>` for sections, `ScrollView` replaced by `<Box>` wrappers.
   - Upgrade Screen: `<PricingCard>`, `<Button variant="solid">`, `<Accordion>` for FAQ, `<Badge>` for “MOST POPULAR”.
3. **Style Cleanup**
   - Remove redundant `className` strings once equivalent Gluestack props exist; keep Tailwind only for layouts not yet covered.
   - Test dark mode toggle by extending theme tokens and verifying components adapt.
4. **Error Logging & Visual Debugging**
   - Ensure Gluestack components emit meaningful accessibility warnings; pipe those warnings through the shared logging hook for triage.
   - Capture UI-level errors (Layout/Style exceptions) via Sentry breadcrumbs so regressions can be associated with specific screens.
   - Enable React DevTools/Flipper integration for debugging layout during development and document workflow.
5. **Regression Testing**
   - Run Expo app on iOS/Android simulators to ensure layouts match design; adjust theme tokens for spacing if needed.
7. **Testing & CI/CD Focus**
   - Add snapshot or visual regression tests for critical screens using Storybook/Chromatic or Loki to catch UI regressions post-migration.
   - Update Jest config to include Gluestack providers in test wrapper (`renderWithProviders`).
   - Ensure CI runs Expo Storybook build (if added) or at minimum executes component tests after migration.
8. **iOS & Android Verification**
   - Rebuild native projects (`npx expo prebuild --clean` if needed) and run on both platforms to spot styling regressions unique to each OS.
   - Validate accessibility (VoiceOver/TalkBack) for redesigned components before moving to Phase 4.

## Phase 4 – OpenAI Integration & Usage Control

1. **OpenAI Service**
   - Install `openai` SDK. Create `server/src/services/openaiClient.ts` initializing client with env key, default options (model `gpt-4o-mini`, temperature 0.4, max tokens 512).
   - Implement retry/backoff for `429`/`5xx`, set timeout, log errors via pino.
2. **Backend Flow Update**
   - Modify `POST /ideas/:id/messages` to:
     - Fetch session history (limited to last N messages for context window).
     - Build prompt with system instructions describing IdeaSpark tone.
     - Call OpenAI, stream or await completion, persist assistant message, record token usage + cost (pull from SDK `usage`).
   - Add caching layer (Redis) keyed by normalized prompt when appropriate.
3. **Usage Logging & Quotas**
   - Write helper to translate tokens to USD (per model pricing). Store in `AIUsageLog` with `userId`, `ideaSessionId`, `promptTokens`, `completionTokens`, `costUsd`.
   - Update `GET /usage/summary` to aggregate: replies remaining (plan limit - messages), month-to-date tokens, estimated cost.
   - Enforce quotas before calling OpenAI; respond with `402` if limit exceeded, including metadata for UI.
4. **Frontend Enhancements**
   - `app/chat.tsx`: display streaming text (if SSE/WebSocket) or show skeleton loader until message arrives; show toast on errors or quota exhaustion.
   - `app/index.tsx`: show live remaining replies from `/usage/summary`, disable submit when at zero and provide CTA to `/upgrade`.
   - Add usage badge in header showing `used/limit` to reinforce plan messaging.
5. **Error Logging & Monitoring**
   - Emit structured log events for every OpenAI call (request id, model, tokens, duration, cost) and capture failures as fatal logs + Sentry events.
   - Add rate-limit dashboards (Prometheus/Grafana or Datadog) plus alerts when error rate exceeds threshold.
   - Instrument frontend to record breadcrumbs before AI calls (input length, session id) for debugging support tickets.
6. **User Messaging – AI Interactions**
   - Define UX copy for AI-related states:
     - Processing info banner: `"Our AI is thinking... expect a response in a few seconds."`
     - Timeout warning: `"This request is taking longer than expected. You can wait or try resubmitting."`
     - Failure error: `"We couldn’t get a response from the AI right now. Please try again shortly."`
     - Quota warning toast when user has 1 reply left: `"Heads up! Only 1 AI reply remains on your free plan."`
   - Surface these messages via consistent toast/banner components, and ensure analytics events capture when each message is shown.
7. **Testing & CI/CD Focus**
   - Mock OpenAI SDK in Jest to cover success, timeout, and rate-limit retries; assert token logging and quota enforcement logic.
   - Write integration tests simulating hitting usage limits to ensure 402 response and correct payload.
   - Add contract tests for `/usage/summary` and `/ideas/:id/messages` to CI to catch schema drift between frontend DTOs and backend responses.
8. **iOS & Android Verification**
   - Test streaming, loading states, and error banners on both iOS and Android devices to ensure platform-specific text input behaviors (keyboard handling) work while AI calls are pending.
   - Confirm push to upgrade flows behave identically, especially on Android back button vs iOS swipe gesture interactions.

## Phase 5 – Subscription & Monetization

1. **Billing Stack**
   - Decide on Stripe (Checkout + Customer Portal) for MVP web payments; for native IAP, plan follow-up work.
   - Install Stripe SDK server-side and `stripe-react-native` if moving to in-app payments later.
2. **Server Implementation**
   - `POST /billing/checkout-session`: create session tied to authenticated user, return URL for frontend.
   - `POST /billing/portal-session`: allow managing subscription.
   - `POST /billing/webhook`: handle `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated/deleted`. Update `Subscription` table accordingly.
   - Store `stripeCustomerId` per user and sync plan tier + limits.
3. **Frontend Upgrade Flow**
   - In `app/upgrade.tsx`, call checkout endpoint, open returned URL using `WebBrowser.openBrowserAsync`, listen for success deep link.
   - Show loading/progress states while session is being generated; handle errors gracefully.
   - On success, refresh `/usage/summary` and `/me` to reflect new plan.
4. **Plan Enforcement**
   - Server: middleware to inject `req.plan` from Subscription, enforce per-endpoint limits (ideas per day, replies per idea).
   - Client: surface premium-only UI (e.g., unlimited label, faster response badge) when `plan === 'pro'`.
5. **Error Logging & Auditing**
   - Log every billing action (checkout session creation, webhook payload) with correlation IDs to trace customer issues; store summarized events in `BillingAudit` table.
   - Capture Stripe webhook failures/exceptions in Sentry with payload metadata (excluding PII) for rapid triage.
   - Provide admin UI or log query to inspect subscription changes when disputes occur.
6. **User Messaging – Billing & Upgrades**
   - Define consistent copy for upgrade funnel:
     - Success banner: `"You're Pro now! Enjoy unlimited AI replies and priority responses."`
     - Payment processing info: `"Securely redirecting to our payment partner…"`
     - Payment failure error: `"Payment didn’t complete. No charges were made—please try again or use a different method."`
     - Cancellation confirmation: `"Your subscription will remain active until {{date}}. You can reactivate anytime."`
   - Implement inline hints on upgrade screen reminding users of remaining free replies and benefits.
   - Surface plan-change notifications via push/email templates referenced here for consistency.
7. **Testing & CI/CD Focus**
   - Write webhook handler tests using Stripe CLI fixtures to validate signature verification and subscription state transitions.
   - Add e2e test (Cypress/Detox) that mocks successful upgrade flow and verifies plan change in UI.
   - Configure CI to run Stripe webhook unit tests with secret env vars pulled from repository secrets.
8. **iOS & Android Verification**
   - Run upgrade flows on both iOS and Android (using sandbox payment/testing flows) to ensure redirects/deep links return correctly.
   - Verify platform-specific purchase restore flows (e.g., Android back button from checkout) behave gracefully.

## Phase 6 – Profile & Settings Features

1. **User Profile API**
   - Endpoints: `GET /users/me`, `PATCH /users/me` (name, notification prefs, theme), `POST /users/avatar` (upload signed URL), `POST /users/change-password`.
   - Add S3/Supabase storage helper for avatar uploads; return final URL.
2. **Expo Screen Wiring**
   - Hook “Update Email” and “Change Password” buttons (`app/profile.tsx:330-356`) to modals/forms backed by new endpoints.
   - Wire notification & dark mode switches to backend fields so preferences persist across devices.
   - Implement refresh button to call `/users/me` again instead of local timeout.
3. **Account Deletion**
   - Add `DELETE /users/me` performing soft delete, queueing job for data purge.
   - Confirm deletion modals lock behind extra confirmation.
4. **Audit Logging & Error Capture**
   - Persist profile changes and dangerous actions (password/email change, delete account) into an audit log with actor + timestamp.
   - Emit Sentry breadcrumbs when toggles fail to save or when avatar uploads error, aiding support debugging.
   - Add backend alerts for repeated failed profile updates (possible abuse or bug).
5. **User Messaging – Profile & Settings**
   - Define user-friendly copy:
     - Profile update success toast: `"Profile updated successfully."`
     - Update error: `"We couldn’t save your changes. Please try again."`
     - Logout confirm modal: `"Are you sure you want to log out?"`
     - Delete account warning text: `"This will permanently remove your ideas and AI conversations. This action cannot be undone."`
     - Notification toggle info: `"Enable alerts to get notified when new AI responses are ready."`
   - Ensure these strings support interpolation (e.g., include affected setting names) and reside in centralized copy file.
6. **Testing & CI/CD Focus**
   - Backend tests for profile PATCH validation, avatar upload signature generation, delete flow (ensuring cascading cleanup jobs scheduled).
   - Frontend tests for toggles persisting state and delete-account confirmation sequence.
   - Add nightly CI job (scheduled workflow) hitting staging `/users/me` endpoints to ensure auth/session flow stays healthy.
7. **iOS & Android Verification**
   - Test profile editing, avatar upload, and destructive actions on both platforms (pay attention to image picker/camera permissions differences).
   - Confirm platform-specific UI affordances (iOS swipe back, Android hardware back) don't bypass confirmation dialogs.

## Phase 7 – Notifications & Messaging (Firebase FCM)

1. **Firebase Project & Credentials**
   - Create Firebase project (if not existing), enable Cloud Messaging, download `google-services.json` and `GoogleService-Info.plist`, and integrate via Expo config plugins.
   - Store Firebase server key/credentials in Secrets Manager and `.env` placeholders (never commit raw keys).
2. **Expo Notifications Integration**
   - Install `expo-notifications`, configure push permissions prompts, and implement registration flow storing Expo push token + FCM token (Android) in backend via `/notifications/register` endpoint.
   - Handle notification handlers for foreground/background to navigate users to relevant screens (e.g., open chat session).
3. **Backend Notification Service**
   - Add `firebase-admin` service to send FCM messages; wrap with queue/worker if necessary for retries.
   - Implement endpoints or jobs that send push notifications on key events (idea response ready, quota near limit, subscription expiring).
4. **Trigger Wiring**
   - Connect notification service to domain events (e.g., after AI response persisted, enqueue message; before free quota exhaustion, send warning) and ensure opt-in preferences from profile settings respected.
5. **Logging & Monitoring**
   - Log every notification attempt with status (success/failure, reason) and expose metrics (delivery rate, retries) to monitoring dashboards.
   - Capture FCM errors (invalid token, quota exceeded) in Sentry, auto-prune invalid tokens from DB.
6. **User Messaging – Push Notifications**
   - Define permission prompts and fallback copy:
     - System permission explainer modal preceding OS prompt: `"Allow IdeaSpark to send you updates when new AI insights are ready."`
     - Permission denied info card: `"Notifications are off. Turn them on in Settings to stay updated."`
     - Notification payload templates (title/body) for events like `AI Reply Ready`, `Quota Low`, `Subscription Renewed`.
   - Ensure localization readiness and consistency between push payloads and in-app banners.
7. **Testing & CI/CD Focus**
   - Write unit tests for notification service mocking Firebase Admin SDK; ensure retries/backoff logic tested.
   - Add Expo/E2E test verifying push registration flow (mocking device token) and deep-link navigation handler.
   - Configure staging environment with test Firebase project and run smoke tests sending push to test devices before release.
8. **iOS & Android Verification**
   - Test notification permissions, receipt, and tap-through navigation on iOS (foreground/background) and Android (different notification channels) to ensure consistent behavior.
   - Confirm icon assets, sounds, and badge counts render correctly per platform guidelines.

## Phase 8 – Analytics, CAC & Usage Reporting

1. **Analytics SDK Integration**
   - Install Amplitude or Segment SDK for Expo. Initialize in `AppProvider`, respect user consent.
   - Replace stubbed `useAnalytics` with real tracker logging: auth events, idea submissions, AI replies, errors, upgrade views/purchases.
2. **Marketing Attribution**
   - Capture `utm_*` params via inbound links or referral codes, store in AsyncStorage, send with registration payload, persist in `MarketingAttribution` table.
   - Build admin query/report summarizing new users per campaign vs manual marketing spend input (CSV or admin UI).
3. **Per-User AI Cost Dashboard**
   - Backend endpoint `GET /admin/usage` returning aggregated token + cost per user/session.
   - Create simple internal dashboard (could be Next.js page or admin API consumed by BI tool) showing cost vs revenue per plan tier, flagging outliers.
4. **Alerts & Budgets**
   - Configure OpenAI hard limits + email alerts.
   - Add backend cron to monitor daily spend; send Slack/email alert if cost spikes.
5. **Error Logging & Data Quality Monitoring**
   - Log analytics dispatch failures (e.g., network errors) with payload metadata so events can be replayed if needed.
   - Add automated checks comparing analytics counts vs database truth to catch discrepancies; alert when deltas exceed thresholds.
   - Instrument admin dashboards to report their own query errors and send Sentry events when aggregation fails.
6. **Testing & CI/CD Focus**
   - Unit tests for analytics wrapper ensuring events include required properties; mock SDK.
   - Data validation tests for marketing attribution ETL (ensure campaign IDs stored and retrievable).
   - Add CI job that runs lightweight seed + aggregation query to ensure admin reporting endpoints (`/admin/usage`) function before deploys.
7. **iOS & Android Verification**
   - Validate analytics events fire with correct properties on both iOS and Android (use native debuggers to inspect payloads).
   - Confirm attribution parameters persist across cold starts on each platform (especially Android where intent extras differ).

## Phase 9 – Cloud Deployment & Operations

1. **Containerization**
   - Create Dockerfile for backend (node-alpine, install, build, run `node dist/index.js`).
   - For Expo web build, create Dockerfile that runs `expo export:web` and serves via nginx (optional for staging).
   - Add `.dockerignore` covering `node_modules`, caches.
2. **Infrastructure Provisioning**
   - Choose platform (e.g., AWS ECS Fargate). Provision: VPC, ECS cluster, Application Load Balancer, RDS Postgres, Elasticache Redis, S3 bucket for assets, Parameter Store/Secrets Manager for secrets.
   - Create staging + production environments with IaC (Terraform or AWS CDK) or document manual steps if time-limited.
3. **CI/CD Pipeline**
   - Update GitHub Actions: on push to `main`, build Docker image, push to ECR/registry, run migrations `prisma migrate deploy`, deploy to ECS via `aws ecs update-service`.
   - Add manual approval for production deployment.
4. **Monitoring & Logging**
   - Ship logs to CloudWatch or Logtail with structured fields (request id, user id, endpoint, latency).
   - Configure metrics/alerts: CPU/memory, HTTP 5xx, latency, OpenAI error rate, Stripe webhook failures.
   - Set budget alerts in AWS + OpenAI dashboard.
5. **Security Hardening**
   - Enforce HTTPS via ACM cert, redirect HTTP.
   - Lock down DB/Redis security groups to backend network only.
   - Enable WAF rules for common threats, configure CORS/CSRF protections.
   - Rotate secrets prior to launch; document schedule for periodic rotation.
6. **Testing & CI/CD Focus**
   - Add deployment pipeline stages: build → unit tests → integration tests → staging deploy → smoke tests → manual approval → production deploy.
   - Implement automated smoke test script (hitting `/healthz`, `/me`, `/usage/summary`) executed post-deploy via CI to validate environment.
   - Configure canary deployment or blue/green process in pipeline to allow quick rollback if smoke tests fail.

## Phase 10 – Testing, Performance & Documentation

1. **Automated Testing**
   - Expand backend Jest suite to cover auth edge cases, quota enforcement, OpenAI client wrapper (mocked), billing webhooks.
   - Add React Native Testing Library tests for each screen (form validation, loading states, error displays).
   - Create Detox or Cypress E2E run covering auth → idea submission → chat → upgrade flow.
2. **Performance & Load**
   - Use k6/JMeter to simulate concurrent chat sessions; monitor DB queries, OpenAI rate-limits, and scale recommendations.
   - Tune Prisma queries with indexes, add caching for heavy endpoints.
3. **Documentation & Compliance**
   - Update `README.md` with environment setup, scripts, architecture diagram link, and deployment instructions.
   - Draft privacy policy addendum describing OpenAI data usage and retention.
   - Create runbooks: incident response, rollback steps, backup/restore verification, support FAQ.
4. **Observability & Logging Review**
   - Verify Sentry/monitoring dashboards show expected throughput, and error budgets are defined for each service.
   - Perform log redaction audit ensuring no PII or secrets leak into logs; update filters if needed.
   - Run chaos drills triggering synthetic errors to confirm alerting/on-call flows work prior to GA launch.
5. **Launch Checklist**
   - Execute final QA on staging, confirm monitoring alerts fire, verify backups, and run soft-launch/beta before wide release.
6. **Testing & CI/CD Focus**
   - Track code coverage metrics per package and enforce thresholds in CI (e.g., 85% statements backend, 75% frontend).
   - Schedule weekly pipeline that runs full e2e + load tests against staging to detect regressions outside PR flow.
   - Document CI/CD architecture (diagram + README section) so onboarding engineers understand pipeline triggers, environments, and rollback steps.

---

Track completion directly in this file or via project management tool; each bullet is ready for implementation without further clarification.
