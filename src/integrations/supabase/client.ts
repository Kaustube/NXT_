import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://pdqxmkxjgdoghxlawzds.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkcXhta3hqZ2RvZ2h4bGF3emRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTI3ODcsImV4cCI6MjA5MTk4ODc4N30.pZV0cOvbcO1sJxvBG19g05cUWrb5d7vL_20qugl2lk0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'sb-auth-token',
    // Debug mode to see what's happening
    debug: import.meta.env.DEV,
  },
  global: {
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate',
      'pragma': 'no-cache',
      'expires': '0',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Monitor session changes and log them (dev only)
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth State Change:', event, {
      hasSession: !!session,
      userId: session?.user?.id,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A',
    });
  });
}
