// App version - increment this to force users to clear cache
export const APP_VERSION = '2.5.0';

// Check if user needs to clear cache
export function checkVersion() {
  const stored = localStorage.getItem('app_version');
  if (stored !== APP_VERSION) {
    console.log('🔄 New version detected, clearing non-auth cache...');
    
    // Preserve Supabase auth token — only clear app-level cache
    const authToken = localStorage.getItem('sb-auth-token');
    
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore auth token so user stays logged in
    if (authToken) {
      localStorage.setItem('sb-auth-token', authToken);
    }
    
    localStorage.setItem('app_version', APP_VERSION);
    
    // Reload without cache-busting query param (avoids infinite loops)
    window.location.reload();
  }
}

// Force clear all cache (manual use only)
export function forceClearCache() {
  console.log('🧹 Force clearing all cache...');
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('app_version', APP_VERSION);
  window.location.reload();
}
