# 🧹 Clear Browser Cache & Cookies

## Issue
Your app works in incognito but not in regular browser = **Cookie/Cache issue**

---

## Quick Fix (Choose One)

### Option 1: Clear Site Data (Recommended)

**Chrome/Edge:**
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. Click **Clear site data** button
4. Refresh page (`Ctrl+R` or `Cmd+R`)

**Firefox:**
1. Press `F12` to open DevTools
2. Go to **Storage** tab
3. Right-click on your site → **Delete All**
4. Refresh page

### Option 2: Clear Specific Storage

**In DevTools → Application/Storage:**
1. Expand **Local Storage** → Delete all entries
2. Expand **Session Storage** → Delete all entries
3. Expand **Cookies** → Delete all cookies
4. Expand **IndexedDB** → Delete `supabase-auth-token`
5. Refresh page

### Option 3: Hard Refresh

**Windows/Linux:** `Ctrl + Shift + R`
**Mac:** `Cmd + Shift + R`

### Option 4: Clear All Browser Data

**Chrome:**
1. `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. Select **Cookies and other site data**
3. Select **Cached images and files**
4. Click **Clear data**

---

## Programmatic Fix

Add this to your app to force logout on load (temporary):

```typescript
// In src/main.tsx or src/App.tsx
import { supabase } from "@/integrations/supabase/client";

// Force clear auth on load (TEMPORARY - remove after testing)
supabase.auth.signOut();
localStorage.clear();
sessionStorage.clear();
```

---

## Permanent Fix

Update your auth logic to handle stale sessions:

```typescript
// In src/context/AuthContext.tsx
useEffect(() => {
  // Check if session is valid
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      // Clear invalid session
      supabase.auth.signOut();
      localStorage.clear();
    }
  });
}, []);
```

---

## After Clearing Cache

1. ✅ Close all tabs with your app
2. ✅ Open a new tab
3. ✅ Go to your app URL
4. ✅ Try logging in again

---

## If Still Not Working

The issue might be:
1. **Old service worker** - Go to DevTools → Application → Service Workers → Unregister
2. **Browser extension** - Try disabling extensions
3. **Corrupted profile** - Try a different browser profile

---

**After clearing cache, your app should work in regular browser!** 🎉
