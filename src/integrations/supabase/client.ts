import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded fallback so the app works even if env vars aren't set on Vercel
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://gskxsuvbnezgotvwtgcl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdza3hzdXZibmV6Z290dnd0Z2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTU4NjMsImV4cCI6MjA5MTkzMTg2M30.eTqOx_kCVSgyBY5VwDINyihKmUic8wSubkBFO5HEZpQ";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
