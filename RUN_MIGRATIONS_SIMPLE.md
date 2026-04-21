# 🚀 Simple Migration Guide

## Step 1: Check Your Database Status

Run this file in Supabase SQL Editor:
```
CHECK_DATABASE_STATUS.sql
```

This will show you:
- ✅ What tables exist
- ❌ What's missing
- 📊 Total table count

---

## Step 2: Identify Which Migrations Failed

Based on the output, you'll see which tables are missing. Use this guide:

### If you see "❌ user_roles missing":
**You need to run:** Migrations 1-3 (RBAC setup)

### If you see "❌ courses missing":
**You need to run:** Migration 4 (LMS)

### If you see "❌ sports_facilities missing":
**You need to run:** Migration 7 (Sports)

### If you see "❌ user_xp missing":
**You need to run:** Migration 10 (Gamification)

---

## Step 3: Run Missing Migrations

### Group 1: RBAC Setup (Migrations 1-3)
**Run these in order:**
1. `20260420235959_prepare_for_rbac.sql`
2. `20260421000000_rbac_system.sql`
3. `20260421000000_5_restore_admins.sql`

### Group 2: Core Features (Migrations 4-6)
**Run these in order:**
4. `20260421000001_lms_and_courses.sql`
5. `20260421000002_freelancing_and_help.sql`
6. `20260421000003_email_verification.sql`

### Group 3: Advanced Features (Migrations 7-9)
**Run these in order:**
7. `20260421000004_live_sports_booking.sql`
8. `20260421000005_college_specific_config.sql`
9. `20260421000006_daily_challenges_compiler.sql`

### Group 4: Gamification & Admin (Migrations 10-11)
**Run these in order:**
10. `20260421000007_gamification_streaks.sql`
11. `20260421000008_multi_level_admins.sql`

### Group 5: Final Features (Migrations 12-13)
**Run these in order:**
12. `20260421000009_improved_server_system.sql`
13. `20260421000010_final_enhancements.sql`

### Group 6: Colleges Update (Migration 14)
**Run this last:**
14. `20260421000011_add_indian_colleges.sql`

---

## Common Errors & Fixes

### Error: "relation already exists"
**Fix:** The table is already created. Skip this migration.

### Error: "function does not exist"
**Fix:** You skipped a previous migration. Go back and run it.

### Error: "syntax error at or near"
**Fix:** Copy the ENTIRE file content. Don't copy partial sections.

### Error: "column does not exist"
**Fix:** A previous migration failed. Check which tables are missing.

### Error: "permission denied"
**Fix:** You need to be logged in as the database owner in Supabase.

---

## Quick Troubleshooting

### If NOTHING is working:

**Option 1: Start Fresh (Development Only)**
```sql
-- ⚠️ WARNING: Deletes ALL data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then run ALL migrations from the beginning (including old ones).

**Option 2: Skip to Working State**
Tell me which migration is failing and I'll create a fixed version.

---

## After All Migrations

### Create Your Admin:
```sql
SELECT promote_to_admin_level('your-email@example.com', 'super_admin');
```

### Verify Success:
```sql
-- Should return 65+ tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Should show your admin
SELECT u.email, ur.role, ur.admin_level
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id;
```

---

## Need Help?

Tell me:
1. **Which migration number failed?** (e.g., "Migration 7 failed")
2. **What's the error message?** (copy the full error)
3. **What does CHECK_DATABASE_STATUS.sql show?** (which tables exist)

I'll create a custom fix for you! 🚀
