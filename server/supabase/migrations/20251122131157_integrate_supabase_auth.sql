-- Migration: Integrate Supabase Auth with existing schema
-- This migration modifies the users table to work with Supabase Auth
-- and adds Row Level Security policies

-- Step 1: Change users.id from TEXT to UUID to match auth.users
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid;

-- Step 2: Add foreign key constraint to link with auth.users
-- This ensures users table is always in sync with Supabase Auth
ALTER TABLE users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Step 3: Make passwordHash nullable since Supabase manages passwords
ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Step 4: Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies for users table

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile (for signup)
CREATE POLICY "Users can create own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 6: Create RLS Policies for idea_sessions

-- Users can read their own idea sessions
CREATE POLICY "Users can read own idea sessions"
  ON idea_sessions
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Users can create their own idea sessions
CREATE POLICY "Users can create own idea sessions"
  ON idea_sessions
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own idea sessions
CREATE POLICY "Users can update own idea sessions"
  ON idea_sessions
  FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Users can delete their own idea sessions
CREATE POLICY "Users can delete own idea sessions"
  ON idea_sessions
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- Step 7: Create RLS Policies for idea_messages

-- Users can read messages from their own idea sessions
CREATE POLICY "Users can read own idea messages"
  ON idea_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM idea_sessions
      WHERE idea_sessions.id = idea_messages."ideaSessionId"
      AND idea_sessions."userId" = auth.uid()::text
    )
  );

-- Users can create messages in their own idea sessions
CREATE POLICY "Users can create own idea messages"
  ON idea_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM idea_sessions
      WHERE idea_sessions.id = idea_messages."ideaSessionId"
      AND idea_sessions."userId" = auth.uid()::text
    )
  );

-- Step 8: Create RLS Policies for subscriptions

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Users can create their own subscription (for signup)
CREATE POLICY "Users can create own subscription"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Step 9: Create RLS Policies for notifications

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Step 10: Create RLS Policies for notification_tokens

-- Users can read their own notification tokens
CREATE POLICY "Users can read own notification tokens"
  ON notification_tokens
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Users can create their own notification tokens
CREATE POLICY "Users can create own notification tokens"
  ON notification_tokens
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own notification tokens
CREATE POLICY "Users can update own notification tokens"
  ON notification_tokens
  FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Users can delete their own notification tokens
CREATE POLICY "Users can delete own notification tokens"
  ON notification_tokens
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- Step 11: Create RLS Policies for ai_usage_logs

-- Users can read their own AI usage logs
CREATE POLICY "Users can read own ai usage logs"
  ON ai_usage_logs
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Step 12: Create RLS Policies for analytics_events

-- Users can read their own analytics events
CREATE POLICY "Users can read own analytics events"
  ON analytics_events
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Allow creation of analytics events for authenticated users
CREATE POLICY "Users can create analytics events"
  ON analytics_events
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId" OR "userId" IS NULL);

-- Step 13: Create function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, "passwordHash", "subscriptionPlan", "emailVerified", "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    '', -- Empty password hash since Supabase manages this
    'FREE',
    false,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create trigger to call handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 15: Create function to sync user email updates
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET email = NEW.email,
      "emailVerified" = (NEW.email_confirmed_at IS NOT NULL),
      "emailVerifiedAt" = NEW.email_confirmed_at,
      "updatedAt" = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 16: Create trigger to sync email updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.handle_user_email_update();

-- Step 17: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON idea_sessions TO authenticated;
GRANT SELECT, INSERT ON idea_messages TO authenticated;
GRANT SELECT, INSERT ON subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_tokens TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON ai_usage_logs TO authenticated;
GRANT SELECT, INSERT ON analytics_events TO authenticated;
