// App version - increment this to force users to clear cache
export const APP_VERSION = '2.5.0';

// The actual key Supabase uses to store the session
// Format: sb-{project-ref}-auth-token
const SUPABASE_AUTH_KEY = 'sb-pdqxmkxjgdoghxlawzds-auth-token';

// Check if user needs to clear cache
export function checkVersion() {
  const stored = localStorage.getItem('app_version');
  if (stored !== APP_VERSION) {
    console.log('🔄 New version detected, clearing non-auth cache...');

    // Preserve ALL Supabase auth keys before clearing
    const keysToPreserve: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key === 'supabase.auth.token')) {
        const val = localStorage.getItem(key);
        if (val) keysToPreserve[key] = val;
      }
    }

    localStorage.clear();
    sessionStorage.clear();

    // Restore all Supabase auth keys
    Object.entries(keysToPreserve).forEach(([k, v]) => {
      localStorage.setItem(k, v);
    });

    localStorage.setItem('app_version', APP_VERSION);

    // Don't reload — just update the version marker silently
    // Reloading causes a flash and can interrupt the auth flow
  }
}

// Force clear all cache (manual use only — does NOT clear auth)
export function forceClearCache() {
  console.log('🧹 Force clearing non-auth cache...');

  // Preserve auth keys
  const keysToPreserve: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key === 'supabase.auth.token')) {
      const val = localStorage.getItem(key);
      if (val) keysToPreserve[key] = val;
    }
  }

  localStorage.clear();
  sessionStorage.clear();

  Object.entries(keysToPreserve).forEach(([k, v]) => {
    localStorage.setItem(k, v);
  });

  localStorage.setItem('app_version', APP_VERSION);
  window.location.reload();
}
