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
  },
});
