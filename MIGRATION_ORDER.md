# 🚀 Complete Migration Order for Supabase

## ⚠️ IMPORTANT: You Have Existing Migrations

Your database already has some migrations applied. We need to handle this carefully to avoid conflicts.

---

## 📋 Step-by-Step Migration Process

### **Step 1: Prepare for RBAC (NEW - Run First)**

This migration cleans up the old `user_roles` structure to prepare for the new RBAC system.

```sql
-- File: supabase/migrations/20260420235959_prepare_for_rbac.sql
```

**What it does:**
- Backs up existing admin users
- Drops old `user_roles` table
- Drops old `app_role` enum
- Cleans up old policies

---

### **Step 2: Apply New RBAC System**

```sql
-- File: supabase/migrations/20260421000000_rbac_system.sql
```

**What it does:**
- Creates new role system with 5 roles
- Creates 25+ permissions
- Creates new `user_roles` table with proper structure
- Sets up permission checking functions

---

### **Step 3: Restore Admin Users (NEW - Run After RBAC)**

```sql
-- File: supabase/migrations/20260421000000_5_restore_admins.sql
```

**What it does:**
- Restores admin users from backup
- Converts old admins to super_admins in new system

---

### **Step 4-13: Apply Remaining Migrations**

Continue with the rest of the migrations in order:

4. `20260421000001_lms_and_courses.sql` - LMS system
5. `20260421000002_freelancing_and_help.sql` - Freelancing & support
6. `20260421000003_email_verification.sql` - Email verification
7. `20260421000004_live_sports_booking.sql` - Sports booking
8. `20260421000005_college_specific_config.sql` - College config
9. `20260421000006_daily_challenges_compiler.sql` - Daily challenges
10. `20260421000007_gamification_streaks.sql` - Gamification
11. `20260421000008_multi_level_admins.sql` - Multi-level admins
12. `20260421000009_improved_server_system.sql` - Server system V2
13. `20260421000010_final_enhancements.sql` - Final enhancements

---

## 🎯 Complete Migration List (In Order)

### **Run these in Supabase SQL Editor:**

1. ✅ **`20260420235959_prepare_for_rbac.sql`** ← NEW! Run first
2. ✅ **`20260421000000_rbac_system.sql`**
3. ✅ **`20260421000000_5_restore_admins.sql`** ← NEW! Run after RBAC
4. ✅ **`20260421000001_lms_and_courses.sql`**
5. ✅ **`20260421000002_freelancing_and_help.sql`**
6. ✅ **`20260421000003_email_verification.sql`**
7. ✅ **`20260421000004_live_sports_booking.sql`**
8. ✅ **`20260421000005_college_specific_config.sql`**
9. ✅ **`20260421000006_daily_challenges_compiler.sql`**
10. ✅ **`20260421000007_gamification_streaks.sql`**
11. ✅ **`20260421000008_multi_level_admins.sql`**
12. ✅ **`20260421000009_improved_server_system.sql`**
13. ✅ **`20260421000010_final_enhancements.sql`**

---

## 📝 How to Run Migrations

### **Option 1: Supabase Dashboard (Recommended for your case)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. For each migration file (in order 1-13):
   - Open the file in your code editor
   - Copy the entire SQL content
   - Paste into Supabase SQL Editor
   - Click **Run**
   - Wait for "Success" message
   - Check for any errors before proceeding

### **Option 2: Supabase CLI**

```bash
# This might not work correctly due to existing migrations
# Use Option 1 instead
supabase db push
```

---

## ⚠️ Troubleshooting

### **If you get "table already exists" errors:**

Some tables from old migrations might conflict. Add this at the start of the migration:

```sql
-- Drop existing table if it conflicts
DROP TABLE IF EXISTS table_name CASCADE;
```

### **If you get "function already exists" errors:**

```sql
-- Drop existing function
DROP FUNCTION IF EXISTS function_name CASCADE;
```

### **If you get "policy already exists" errors:**

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

---

## ✅ After All Migrations Complete

### **1. Verify Migration Success**

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see 65+ tables
```

### **2. Check Admin Users**

```sql
-- See if your admin was restored
SELECT u.email, ur.role, ur.admin_level
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

### **3. Create Admin if Needed**

```sql
-- If no admin exists, create one
SELECT promote_to_admin_level('your-email@example.com', 'super_admin');
```

### **4. Test Key Features**

```sql
-- Test sports facilities
SELECT * FROM sports_facilities LIMIT 5;

-- Test daily challenges
SELECT * FROM get_todays_word();

-- Test gamification
SELECT * FROM user_xp LIMIT 5;

-- Test servers
SELECT * FROM servers;
```

---

## 🎉 Success Checklist

After running all migrations, you should have:

- ✅ 65+ database tables
- ✅ 160+ RLS policies
- ✅ 45+ functions
- ✅ New RBAC system with 5 roles
- ✅ 7 admin levels
- ✅ LMS infrastructure
- ✅ Sports booking system
- ✅ Daily challenges
- ✅ Gamification system
- ✅ Server system V2
- ✅ Email verification
- ✅ Marketplace enhancements
- ✅ Job recruiter role

---

## 🚨 If Something Goes Wrong

### **Nuclear Option: Start Fresh**

If migrations are too broken, you can reset:

```sql
-- ⚠️ WARNING: This deletes ALL data!
-- Only use in development

-- Drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run ALL migrations from scratch, including old ones:
-- 1. 20260416213131_0a1d545c-d6f6-4f34-97c1-451e5125d239.sql (original)
-- 2. 20260417000000_notifications.sql
-- 3. 20260417000001_enhancements.sql
-- ... etc (all old migrations)
-- Then the new ones starting with 20260420235959_prepare_for_rbac.sql
```

---

## 📞 Need Help?

If you encounter errors:

1. **Copy the exact error message**
2. **Note which migration file failed**
3. **Check if the table/function already exists**
4. **Try adding DROP IF EXISTS before CREATE**

---

## 🎯 Next Steps After Migrations

1. ✅ Run all 13 migrations
2. ✅ Verify admin user exists
3. ✅ Test key features
4. ✅ Push to Git
5. ⏳ Build remaining UI components
6. ⏳ Launch! 🚀

---

**Version**: 2.1
**Last Updated**: April 21, 2026
**Status**: Ready to Migrate 🎊
