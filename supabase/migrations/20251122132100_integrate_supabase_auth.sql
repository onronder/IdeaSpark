-- Migration: Integrate Supabase Auth with existing schema
-- Converts all TEXT IDs to UUID and integrates with Supabase Auth

-- Step 1: Drop ALL foreign key constraints (using actual constraint names from initial migration)
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_userId_fkey";
ALTER TABLE "idea_sessions" DROP CONSTRAINT "idea_sessions_userId_fkey";
ALTER TABLE "idea_messages" DROP CONSTRAINT "idea_messages_ideaSessionId_fkey";
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";
ALTER TABLE "ai_usage_logs" DROP CONSTRAINT "ai_usage_logs_userId_fkey";
ALTER TABLE "ai_usage_logs" DROP CONSTRAINT "ai_usage_logs_ideaSessionId_fkey";
ALTER TABLE "ai_usage_logs" DROP CONSTRAINT "ai_usage_logs_ideaMessageId_fkey";
ALTER TABLE "marketing_attributions" DROP CONSTRAINT "marketing_attributions_userId_fkey";
ALTER TABLE "billing_audits" DROP CONSTRAINT "billing_audits_userId_fkey";
ALTER TABLE "notification_tokens" DROP CONSTRAINT "notification_tokens_userId_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";
ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_userId_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- Step 2: Clean up all orphaned data before type conversion
-- Delete all data that references users not in auth.users
DELETE FROM "refresh_tokens" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "password_reset_tokens" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "idea_sessions" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "subscriptions" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "marketing_attributions" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "billing_audits" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "notification_tokens" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "notifications" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "ai_usage_logs" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "analytics_events" WHERE "userId" IS NOT NULL AND "userId" NOT IN (SELECT id::text FROM auth.users);
DELETE FROM "audit_logs" WHERE "userId" NOT IN (SELECT id::text FROM auth.users);

-- Delete idea_messages that reference deleted idea_sessions
DELETE FROM "idea_messages" WHERE "ideaSessionId" NOT IN (SELECT id FROM "idea_sessions");

-- Delete ai_usage_logs that reference deleted idea_sessions or idea_messages
DELETE FROM "ai_usage_logs" WHERE "ideaSessionId" IS NOT NULL AND "ideaSessionId" NOT IN (SELECT id FROM "idea_sessions");
DELETE FROM "ai_usage_logs" WHERE "ideaMessageId" IS NOT NULL AND "ideaMessageId" NOT IN (SELECT id FROM "idea_messages");

-- Delete users that don't exist in auth.users
DELETE FROM "users" WHERE id NOT IN (SELECT id::text FROM auth.users);

-- Step 3: Convert all ID columns from TEXT to UUID
-- Start with primary keys that have no dependencies
ALTER TABLE "users" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "idea_sessions" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "idea_messages" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "subscriptions" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "ai_usage_logs" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "marketing_attributions" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "billing_audits" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "notification_tokens" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "notifications" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "analytics_events" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "audit_logs" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;

-- Step 4: Convert all foreign key columns to UUID
ALTER TABLE "refresh_tokens" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "password_reset_tokens" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "idea_sessions" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "idea_messages" ALTER COLUMN "ideaSessionId" TYPE UUID USING "ideaSessionId"::uuid;
ALTER TABLE "subscriptions" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "ai_usage_logs" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "ai_usage_logs" ALTER COLUMN "ideaSessionId" TYPE UUID USING "ideaSessionId"::uuid;
ALTER TABLE "ai_usage_logs" ALTER COLUMN "ideaMessageId" TYPE UUID USING "ideaMessageId"::uuid;
ALTER TABLE "marketing_attributions" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "billing_audits" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "notification_tokens" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "notifications" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "analytics_events" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "audit_logs" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Step 5: Re-add all foreign key constraints
ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "idea_sessions"
  ADD CONSTRAINT "idea_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "idea_messages"
  ADD CONSTRAINT "idea_messages_ideaSessionId_fkey"
  FOREIGN KEY ("ideaSessionId") REFERENCES "idea_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage_logs"
  ADD CONSTRAINT "ai_usage_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage_logs"
  ADD CONSTRAINT "ai_usage_logs_ideaSessionId_fkey"
  FOREIGN KEY ("ideaSessionId") REFERENCES "idea_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_usage_logs"
  ADD CONSTRAINT "ai_usage_logs_ideaMessageId_fkey"
  FOREIGN KEY ("ideaMessageId") REFERENCES "idea_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "marketing_attributions"
  ADD CONSTRAINT "marketing_attributions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_audits"
  ADD CONSTRAINT "billing_audits_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_tokens"
  ADD CONSTRAINT "notification_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analytics_events"
  ADD CONSTRAINT "analytics_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Link users table to Supabase Auth
ALTER TABLE "users"
  ADD CONSTRAINT "users_id_fkey"
  FOREIGN KEY ("id")
  REFERENCES auth.users("id")
  ON DELETE CASCADE;

-- Step 7: Make passwordHash nullable (Supabase manages passwords)
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Step 8: Enable Row Level Security on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "idea_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "idea_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_attributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Step 9: RLS Policies for users table
CREATE POLICY "Users can read own profile"
  ON "users" FOR SELECT USING (auth.uid() = "id");

CREATE POLICY "Users can update own profile"
  ON "users" FOR UPDATE USING (auth.uid() = "id");

CREATE POLICY "Users can create own profile"
  ON "users" FOR INSERT WITH CHECK (auth.uid() = "id");

-- Step 10: RLS Policies for idea_sessions
CREATE POLICY "Users can read own idea sessions"
  ON "idea_sessions" FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can create own idea sessions"
  ON "idea_sessions" FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own idea sessions"
  ON "idea_sessions" FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own idea sessions"
  ON "idea_sessions" FOR DELETE USING (auth.uid() = "userId");

-- Step 11: RLS Policies for idea_messages
CREATE POLICY "Users can read own idea messages"
  ON "idea_messages" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "idea_sessions"
      WHERE "idea_sessions"."id" = "idea_messages"."ideaSessionId"
      AND "idea_sessions"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create own idea messages"
  ON "idea_messages" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "idea_sessions"
      WHERE "idea_sessions"."id" = "idea_messages"."ideaSessionId"
      AND "idea_sessions"."userId" = auth.uid()
    )
  );

-- Step 12: RLS Policies for subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON "subscriptions" FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can create own subscription"
  ON "subscriptions" FOR INSERT WITH CHECK (auth.uid() = "userId");

-- Step 13: RLS Policies for notifications
CREATE POLICY "Users can read own notifications"
  ON "notifications" FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can update own notifications"
  ON "notifications" FOR UPDATE USING (auth.uid() = "userId");

-- Step 14: RLS Policies for notification_tokens
CREATE POLICY "Users can read own notification tokens"
  ON "notification_tokens" FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can create own notification tokens"
  ON "notification_tokens" FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own notification tokens"
  ON "notification_tokens" FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own notification tokens"
  ON "notification_tokens" FOR DELETE USING (auth.uid() = "userId");

-- Step 15: RLS Policies for ai_usage_logs
CREATE POLICY "Users can read own ai usage logs"
  ON "ai_usage_logs" FOR SELECT USING (auth.uid() = "userId");

-- Step 16: RLS Policies for analytics_events
CREATE POLICY "Users can read own analytics events"
  ON "analytics_events" FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can create analytics events"
  ON "analytics_events" FOR INSERT
  WITH CHECK (auth.uid() = "userId" OR "userId" IS NULL);

-- Step 17: Auto-create user profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users ("id", "email", "passwordHash", "subscriptionPlan", "emailVerified", "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    '',
    'FREE',
    false,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 18: Sync email updates trigger
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET "email" = NEW.email,
      "emailVerified" = (NEW.email_confirmed_at IS NOT NULL),
      "emailVerifiedAt" = NEW.email_confirmed_at,
      "updatedAt" = NOW()
  WHERE "id" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.handle_user_email_update();

-- Step 19: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON "users" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "idea_sessions" TO authenticated;
GRANT SELECT, INSERT ON "idea_messages" TO authenticated;
GRANT SELECT, INSERT ON "subscriptions" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "notification_tokens" TO authenticated;
GRANT SELECT, UPDATE ON "notifications" TO authenticated;
GRANT SELECT ON "ai_usage_logs" TO authenticated;
GRANT SELECT, INSERT ON "analytics_events" TO authenticated;
