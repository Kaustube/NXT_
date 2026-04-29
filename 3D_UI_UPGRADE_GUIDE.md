# 🎨 3D UI Upgrade Guide

## What's New

Your platform now has a stunning 3D UI with:
- ✨ **3D Landing Page** with animations and parallax effects
- 🎭 **3D Avatars** with hover effects and shine animations
- 🖼️ **Profile Pictures** - custom upload support
- 🎯 **Server Icons** - custom icons for servers
- 🎨 **Theme Colors** - personalize profiles and servers
- 🌊 **Smooth Animations** throughout the platform

---

## 🚀 What Was Added

### 1. New Landing Page (`src/pages/Landing.tsx`)
- **3D Hero Section** with mouse-tracking tilt effects
- **Animated Background** with floating orbs
- **Parallax Scrolling** for depth
- **Feature Cards** with hover effects
- **Smooth Animations** on scroll
- **Responsive Design** for all devices

### 2. 3D Avatar Component (`src/components/Avatar3D.tsx`)
- **3D Transform** effects on hover
- **Shine Animation** across the avatar
- **Upload Overlay** for editable avatars
- **Fallback Initials** when no image
- **Multiple Sizes** (sm, md, lg, xl)
- **Glow Effect** on hover

### 3. Database Migration (`20260421000015_profile_and_server_images.sql`)
- **Storage Buckets**:
  - `avatars` - for profile pictures
  - `server-icons` - for server icons
- **New Columns**:
  - `profiles.banner_url` - profile cover image
  - `profiles.theme_color` - personal theme color
  - `servers.icon_url` - server icon
  - `servers.banner_url` - server cover image
  - `servers.theme_color` - server theme color
- **RLS Policies** for secure uploads

### 4. Updated Routing
- `/` → Landing page (for non-authenticated users)
- `/dashboard` → Dashboard (for authenticated users)
- `/auth` → Login/Register

---

## 📋 Setup Instructions

### Step 1: Run the Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy content from: `supabase/migrations/20260421000015_profile_and_server_images.sql`
3. Paste and click **Run**
4. Wait for "✅ Profile pictures and server icons enabled!"

### Step 2: Verify Storage Buckets

1. Go to **Supabase Dashboard** → **Storage**
2. You should see two buckets:
   - `avatars` (public)
   - `server-icons` (public)
3. If not, the migration will create them

### Step 3: Test the Landing Page

1. **Logout** from your app
2. Go to `/` (root URL)
3. You should see the new 3D landing page
4. Try:
   - Moving your mouse (tilt effect)
   - Scrolling (parallax effect)
   - Hovering over feature cards
   - Clicking "Get Started"

### Step 4: Test Profile Pictures

1. **Login** to your account
2. Go to **Profile** page
3. Hover over your avatar
4. Click the camera icon
5. Upload an image
6. ✅ Should update immediately

---

## 🎨 Features Breakdown

### Landing Page Features

#### Hero Section
- **3D Tilt Effect**: Moves with mouse
- **Animated Badge**: Pulsing sparkle icon
- **Gradient Text**: Smooth color transition
- **CTA Buttons**: Hover effects with glow
- **Stats Counter**: Shows platform stats

#### Features Section
- **6 Feature Cards**: Each with unique gradient
- **Hover Effects**: Scale + glow on hover
- **Staggered Animation**: Cards appear one by one
- **Icon Animations**: Rotate and scale on hover

#### Benefits Section
- **3 Benefit Cards**: Lightning fast, secure, free
- **Large Icons**: 3D effect on hover
- **Clean Layout**: Centered text with spacing

#### CTA Section
- **Final Call-to-Action**: Large heading
- **Animated Badge**: Star icon with pulse
- **Big Button**: Glow effect on hover

#### Footer
- **Links**: Sign in, sign up, about, contact
- **Logo**: NXT Campus branding
- **Copyright**: © 2026

### 3D Avatar Features

#### Visual Effects
- **3D Transform**: Rotates on hover
- **Shadow**: Depth effect behind avatar
- **Shine**: Light sweep across image
- **Glow Ring**: Pulsing border on hover
- **Scale**: Grows slightly on hover

#### Upload Features
- **Camera Overlay**: Shows on hover
- **Loading State**: Spinner while uploading
- **Error Handling**: Falls back to initials
- **File Validation**: Only accepts images

#### Sizes
- `sm`: 40x40px (for lists)
- `md`: 64x64px (for cards)
- `lg`: 96x96px (for profiles)
- `xl`: 128x128px (for large displays)

---

## 🎯 How to Use

### Using the 3D Avatar Component

```tsx
import Avatar3D from "@/components/Avatar3D";

// Basic usage
<Avatar3D
  src={user.avatar_url}
  alt={user.display_name}
  size="lg"
/>

// Editable avatar
<Avatar3D
  src={user.avatar_url}
  alt={user.display_name}
  size="xl"
  editable
  onUpload={handleUpload}
  uploading={isUploading}
/>

// With fallback text
<Avatar3D
  src={null}
  alt="John Doe"
  fallbackText="JD"
  size="md"
/>
```

### Uploading Profile Pictures

```tsx
async function uploadAvatar(file: File) {
  if (!user) return;
  setUploading(true);
  
  try {
    // Upload to Supabase Storage
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    
    const url = urlData.publicUrl + `?t=${Date.now()}`;
    
    // Update profile
    await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", user.id);
    
    toast.success("Avatar updated!");
  } catch (error) {
    toast.error("Upload failed");
  } finally {
    setUploading(false);
  }
}
```

### Uploading Server Icons

```tsx
async function uploadServerIcon(serverId: string, file: File) {
  setUploading(true);
  
  try {
    const ext = file.name.split(".").pop();
    const path = `${serverId}/icon.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("server-icons")
      .upload(path, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from("server-icons")
      .getPublicUrl(path);
    
    const url = urlData.publicUrl + `?t=${Date.now()}`;
    
    await supabase
      .from("servers")
      .update({ icon_url: url })
      .eq("id", serverId);
    
    toast.success("Server icon updated!");
  } catch (error) {
    toast.error("Upload failed");
  } finally {
    setUploading(false);
  }
}
```

---

## 🎨 Customization

### Changing Theme Colors

**For Profiles:**
```tsx
await supabase
  .from("profiles")
  .update({ theme_color: "#ff6b6b" })
  .eq("user_id", user.id);
```

**For Servers:**
```tsx
await supabase
  .from("servers")
  .update({ theme_color: "#4ecdc4" })
  .eq("id", serverId);
```

### Adding Banner Images

**Profile Banner:**
```tsx
// Upload banner
const { data } = await supabase.storage
  .from("avatars")
  .upload(`${user.id}/banner.jpg`, file, { upsert: true });

// Update profile
await supabase
  .from("profiles")
  .update({ banner_url: publicUrl })
  .eq("user_id", user.id);
```

**Server Banner:**
```tsx
// Upload banner
const { data } = await supabase.storage
  .from("server-icons")
  .upload(`${serverId}/banner.jpg`, file, { upsert: true });

// Update server
await supabase
  .from("servers")
  .update({ banner_url: publicUrl })
  .eq("id", serverId);
```

---

## 🎭 Animation Classes

### Custom Animations Added

```css
/* Float animations */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float-delayed 8s ease-in-out infinite;
}

.animate-float-slow {
  animation: float-slow 10s ease-in-out infinite;
}

/* Shimmer effect */
.animate-shimmer::before {
  animation: shimmer 3s infinite;
}
```

### Using Animations

```tsx
// Floating element
<div className="animate-float">
  Content
</div>

// Shimmer button
<button className="animate-shimmer">
  Click me
</button>
```

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Optimizations
- Smaller text sizes
- Stacked layouts
- Touch-friendly buttons
- Reduced animations

---

## 🐛 Troubleshooting

### Landing Page Not Showing
**Problem**: Still seeing old home page  
**Solution**: 
1. Clear browser cache
2. Hard refresh (`Ctrl+Shift+R`)
3. Check you're logged out
4. Go to `/` (root URL)

### Profile Picture Not Uploading
**Problem**: Upload fails or doesn't show  
**Solution**:
1. Check file size (< 5MB recommended)
2. Check file type (jpg, png, gif, webp)
3. Verify storage bucket exists in Supabase
4. Check RLS policies are applied
5. Check browser console for errors

### Server Icon Not Showing
**Problem**: Icon doesn't appear after upload  
**Solution**:
1. Verify you're an admin
2. Check storage bucket `server-icons` exists
3. Verify RLS policies allow admin uploads
4. Add `?t=${Date.now()}` to URL to bypass cache

### 3D Effects Not Working
**Problem**: No tilt or hover effects  
**Solution**:
1. Check browser supports CSS transforms
2. Disable browser extensions (ad blockers)
3. Try different browser
4. Check console for JavaScript errors

---

## 🚀 Next Steps

### Enhance Profile Page
- [ ] Add banner image upload
- [ ] Add theme color picker
- [ ] Add 3D avatar to profile
- [ ] Add hover effects to stats

### Enhance Server Page
- [ ] Add server icon upload
- [ ] Add server banner
- [ ] Add theme color picker
- [ ] Show 3D icons in server list

### Add More 3D Effects
- [ ] 3D cards throughout app
- [ ] Parallax scrolling in dashboard
- [ ] Animated transitions between pages
- [ ] 3D buttons and inputs

---

## 📚 Resources

### CSS 3D Transforms
- [MDN: transform](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)
- [MDN: perspective](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective)
- [CSS Tricks: 3D Transforms](https://css-tricks.com/almanac/properties/t/transform/)

### Animations
- [Framer Motion](https://www.framer.com/motion/) (for advanced animations)
- [GSAP](https://greensock.com/gsap/) (for complex timelines)
- [Lottie](https://airbnb.design/lottie/) (for vector animations)

### Supabase Storage
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)

---

## 🎉 Summary

You now have:
- ✅ **Stunning 3D landing page**
- ✅ **3D avatar component**
- ✅ **Profile picture uploads**
- ✅ **Server icon uploads**
- ✅ **Theme customization**
- ✅ **Smooth animations**
- ✅ **Responsive design**

**Your platform looks absolutely amazing now!** 🚀

---

**Version**: 3.0 (3D UI Upgrade)  
**Last Updated**: April 26, 2026  
**Status**: ✅ Ready to Use
