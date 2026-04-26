// App version - increment this to force users to clear cache
export const APP_VERSION = '2.4.0';

// Check if user needs to clear cache
export function checkVersion() {
  const stored = localStorage.getItem('app_version');
  if (stored !== APP_VERSION) {
    // Version changed, clear cache
    console.log('New version detected, clearing cache...');
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('app_version', APP_VERSION);
    window.location.reload();
  }
}
