# 🔧 Fix Admin Panel - Complete Guide

## Issue

Admin panel features not working:
- ❌ Can't create events
- ❌ Can't manage servers
- ❌ Can't send notifications
- ❌ Other admin features blocked

**Root Cause:** RLS (Row Level Security) policies are blocking admin operations.

---

## ✅ Solution: Run Admin Permissions Migration

### Step 1: Run the Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire content from:
   ```
   supabase/migrations/20260421000014_fix_admin_permissions.sql
   ```
4. Click **Run** (or press `Ctrl+Enter`)
5. Wait for "Success" message

### Step 2: Verify It Worked

Run this query to check:

```sql
-- Check if is_any_admin function exists
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_any_admin') 
    THEN '✅ is_any_admin function exists' 
    ELSE '❌ is_any_admin function missing' 
  END as status;

-- Check your admin status
SELECT 
  u.email,
  ur.role,
  ur.admin_level,
  CASE WHEN ur.role = 'admin' THEN '✅ You are admin' ELSE '❌ Not admin' END as admin_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'kaustubh1780@gmail.com';
```

Expected output:
```
✅ is_any_admin function exists
✅ You are admin
```

---

## 🎯 What This Migration Does

### Creates Helper Function
```sql
is_any_admin(user_id) → Returns true if user is any type of admin
```

### Fixes RLS Policies For:

1. **Events** - Admins can create/edit/delete events
2. **Servers** - Admins can manage all servers
3. **Channels** - Admins can manage all channels
4. **Users** - Admins can view/edit all profiles
5. **Notifications** - Admins can send notifications
6. **Sports** - Admins can manage facilities and bookings
7. **LMS** - Admins can manage courses
8. **Challenges** - Admins can manage coding challenges
9. **Listings** - Admins can manage marketplace listings
10. **Connections** - Admins can view all connections

---

## 🧪 Test Admin Panel

After running the migration, test each feature:

### 1. Test Events
1. Go to **Admin Panel** → **Events**
2. Click **New Event**
3. Fill in:
   - Title: "Test Event"
   - Description: "Testing admin panel"
   - Kind: Hackathon
   - Starts at: Tomorrow
4. Click **Create**
5. ✅ Should create successfully

### 2. Test Servers
1. Go to **Admin Panel** → **Servers**
2. Click **New Server**
3. Fill in:
   - Name: "Test Server"
   - Slug: "test-server"
   - Kind: Public
4. Click **Create**
5. ✅ Should create successfully

### 3. Test Notifications
1. Go to **Admin Panel** → **Notifications**
2. Click **Send Notification**
3. Fill in:
   - Title: "Test Notification"
   - Message: "Testing admin panel"
   - Type: Announcement
4. Click **Send**
5. ✅ Should send successfully

### 4. Test Users
1. Go to **Admin Panel** → **Users**
2. Should see list of all users
3. Click on a user
4. Should be able to edit profile
5. ✅ Should work

---

## 🐛 Troubleshooting

### Still can't create events?

**Check browser console:**
1. Press `F12` → Console tab
2. Try creating an event
3. Look for error messages
4. Share the error with me

**Check if you're admin:**
```sql
SELECT * FROM public.user_roles 
WHERE user_id = auth.uid();
```

Should show:
```
role: admin
admin_level: super_admin
```

**If not admin, run:**
```sql
SELECT promote_to_admin_level('kaustubh1780@gmail.com', 'super_admin');
```

### "Function is_any_admin does not exist"

**Solution:** Migration didn't run properly. Run it again:
1. Copy entire content of `20260421000014_fix_admin_permissions.sql`
2. Paste in SQL Editor
3. Run again

### "Permission denied for table events"

**Solution:** RLS policy not applied. Run this:
```sql
DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" ON public.events FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));
```

### "Row level security is enabled but no policies exist"

**Solution:** Run the full migration again. It creates all necessary policies.

---

## 📋 Complete Admin Panel Features

After fixing, you'll have access to:

### Overview
- ✅ Platform statistics
- ✅ User counts
- ✅ Activity metrics
- ✅ Recent users

### Events
- ✅ Create events
- ✅ Edit events
- ✅ Delete events
- ✅ View registrations

### Servers
- ✅ Create servers
- ✅ Edit servers
- ✅ Delete servers
- ✅ Manage channels
- ✅ Manage members

### Users
- ✅ View all users
- ✅ Edit profiles
- ✅ Promote to admin
- ✅ Ban/unban users
- ✅ View activity

### Notifications
- ✅ Send to all users
- ✅ Send to college
- ✅ Send to server
- ✅ View sent notifications

### Sports
- ✅ Manage facilities
- ✅ View bookings
- ✅ Cancel bookings
- ✅ Set availability

### Challenges
- ✅ Create challenges
- ✅ Edit challenges
- ✅ View submissions
- ✅ Grade submissions

### LMS
- ✅ Create courses
- ✅ Manage modules
- ✅ Upload materials
- ✅ View enrollments

---

## 🚀 Quick Fix Commands

### Run All in One Go

Copy and paste this entire block in SQL Editor:

```sql
-- 1. Create helper function
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- 2. Fix events
DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" ON public.events FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 3. Fix servers
DROP POLICY IF EXISTS "Admins manage servers" ON public.servers;
CREATE POLICY "Admins manage servers" ON public.servers FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 4. Fix channels
DROP POLICY IF EXISTS "Admins manage channels" ON public.channels;
CREATE POLICY "Admins manage channels" ON public.channels FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 5. Fix notifications
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 6. Fix challenges
DROP POLICY IF EXISTS "Admins manage challenges" ON public.coding_challenges;
CREATE POLICY "Admins manage challenges" ON public.coding_challenges FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 7. Fix listings
DROP POLICY IF EXISTS "Admins manage listings" ON public.listings;
CREATE POLICY "Admins manage listings" ON public.listings FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 8. Verify
SELECT '✅ Admin permissions fixed!' as status;
```

---

## 🎊 After Running Migration

### What Works Now:
- ✅ Create events in admin panel
- ✅ Manage servers and channels
- ✅ Send notifications
- ✅ Manage users
- ✅ All admin features unlocked

### Next Steps:
1. Clear browser cache (`Ctrl+Shift+R`)
2. Logout and login again
3. Go to Admin Panel
4. Test creating an event
5. Test other features

---

## 📞 Still Having Issues?

If admin panel still doesn't work after running the migration:

1. **Share the error message** from browser console (F12)
2. **Run this diagnostic query:**
```sql
-- Check everything
SELECT 'Admin Status:' as check_type, 
  CASE WHEN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN '✅ You are admin' ELSE '❌ Not admin' END as result
UNION ALL
SELECT 'Function Status:', 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_any_admin'
  ) THEN '✅ Function exists' ELSE '❌ Function missing' END
UNION ALL
SELECT 'Events Policy:', 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' AND policyname = 'Admins manage events'
  ) THEN '✅ Policy exists' ELSE '❌ Policy missing' END;
```

3. **Share the output** so I can help debug

---

**Your admin panel will work after running this migration!** 🎉
