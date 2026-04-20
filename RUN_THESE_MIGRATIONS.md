# 🚀 QUICK START: Run These Migrations

## ⚡ Copy-Paste This List

Run these **13 migration files** in Supabase SQL Editor, **in this exact order**:

---

### **1. Prepare for RBAC** ⭐ NEW!
```
supabase/migrations/20260420235959_prepare_for_rbac.sql
```
**Purpose**: Cleans up old user_roles structure

---

### **2. RBAC System**
```
supabase/migrations/20260421000000_rbac_system.sql
```
**Purpose**: New role-based access control with 5 roles and 25+ permissions

---

### **3. Restore Admins** ⭐ NEW!
```
supabase/migrations/20260421000000_5_restore_admins.sql
```
**Purpose**: Restores your admin users from old system

---

### **4. LMS & Courses**
```
supabase/migrations/20260421000001_lms_and_courses.sql
```
**Purpose**: Learning management system with courses, modules, lessons

---

### **5. Freelancing & Help**
```
supabase/migrations/20260421000002_freelancing_and_help.sql
```
**Purpose**: Freelancing platform + help/support system

---

### **6. Email Verification**
```
supabase/migrations/20260421000003_email_verification.sql
```
**Purpose**: 6-digit email verification codes

---

### **7. Live Sports Booking**
```
supabase/migrations/20260421000004_live_sports_booking.sql
```
**Purpose**: Real-time sports facility booking with auto-expiry

---

### **8. College Config**
```
supabase/migrations/20260421000005_college_specific_config.sql
```
**Purpose**: College-specific configurations and settings

---

### **9. Daily Challenges**
```
supabase/migrations/20260421000006_daily_challenges_compiler.sql
```
**Purpose**: Daily word, coding problems, test prep questions

---

### **10. Gamification**
```
supabase/migrations/20260421000007_gamification_streaks.sql
```
**Purpose**: XP, levels, badges, achievements, streaks, leaderboards

---

### **11. Multi-Level Admins**
```
supabase/migrations/20260421000008_multi_level_admins.sql
```
**Purpose**: 7 admin levels with hierarchical permissions

---

### **12. Server System V2**
```
supabase/migrations/20260421000009_improved_server_system.sql
```
**Purpose**: Auto-join college servers, group chats, invite codes

---

### **13. Final Enhancements**
```
supabase/migrations/20260421000010_final_enhancements.sql
```
**Purpose**: Email verification for college access, job recruiter role, enhanced marketplace

---

## 🎯 After Running All Migrations

### Create Your Admin User:

```sql
-- Replace with your email
SELECT promote_to_admin_level('your-email@example.com', 'super_admin');
```

### Verify Success:

```sql
-- Should return your email with super_admin level
SELECT u.email, ur.role, ur.admin_level
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'your-email@example.com';
```

---

## ✅ Success Indicators

After all migrations, you should have:

- ✅ **65+ tables** created
- ✅ **160+ RLS policies** active
- ✅ **45+ functions** available
- ✅ **No errors** in SQL Editor
- ✅ **Admin user** created

---

## 🚨 If You Get Errors

### "Column role does not exist"
✅ **Fixed!** The prepare_for_rbac migration handles this.

### "Table already exists"
Add at the start of migration:
```sql
DROP TABLE IF EXISTS table_name CASCADE;
```

### "Function already exists"
Add at the start of migration:
```sql
DROP FUNCTION IF EXISTS function_name CASCADE;
```

---

## 📞 Quick Help

**Error on migration #1-3?**
- Old user_roles structure conflict
- Make sure you run #1 (prepare_for_rbac) first

**Error on migration #4-13?**
- Check previous migration completed successfully
- Look for red error messages in SQL Editor
- Copy error message and check which table/function failed

---

## 🎉 You're Done!

Once all 13 migrations run successfully:

1. ✅ Create admin user (SQL above)
2. ✅ Test features (see QUICK_REFERENCE.md)
3. ✅ **Tell me you're done** - I'll help you push to Git!
4. ⏳ Build remaining UI components
5. ⏳ Launch! 🚀

---

**Total Migrations**: 13
**Estimated Time**: 5-10 minutes
**Difficulty**: Easy (just copy-paste!)

**Let me know when you're done!** 🎊
