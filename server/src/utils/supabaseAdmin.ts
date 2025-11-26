import { config } from '../config';
import { logger } from './logger';

const supabaseAdminLogger = logger.child({ module: 'supabaseAdmin' });

type SupabaseClientLike = {
  auth: {
    admin: {
      deleteUser: (id: string) => Promise<{ error: any | null }>;
    };
  };
};

let supabaseAdmin: SupabaseClientLike | null = null;

/**
 * Lazily create a Supabase admin client using the service role key.
 * Uses dynamic require so tests and environments without the package
 * installed do not crash.
 */
function getSupabaseAdmin(): SupabaseClientLike | null {
  if (!config.supabase.url || !config.supabase.serviceKey) {
    supabaseAdminLogger.warn(
      'Supabase admin credentials not configured - auth user deletion disabled'
    );
    return null;
  }

  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('@supabase/supabase-js') as {
      createClient: (url: string, key: string, options?: any) => SupabaseClientLike;
    };

    supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    supabaseAdminLogger.info('Supabase admin client initialized');
    return supabaseAdmin;
  } catch (err) {
    supabaseAdminLogger.error(
      { err },
      'Failed to initialize Supabase admin client - auth user deletion disabled'
    );
    supabaseAdmin = null;
    return null;
  }
}

/**
 * Best-effort deletion of the Supabase auth user corresponding to the
 * given userId. Fails silently (with logging) so account deletion
 * never breaks due to admin API issues.
 */
export async function deleteSupabaseAuthUser(userId: string): Promise<void> {
  const client = getSupabaseAdmin();

  if (!client) {
    return;
  }

  try {
    const { error } = await client.auth.admin.deleteUser(userId);

    if (error) {
      supabaseAdminLogger.error({ err: error, userId }, 'Failed to delete Supabase auth user');
    } else {
      supabaseAdminLogger.info({ userId }, 'Supabase auth user deleted');
    }
  } catch (err) {
    supabaseAdminLogger.error({ err, userId }, 'Unexpected error deleting Supabase auth user');
  }
}

