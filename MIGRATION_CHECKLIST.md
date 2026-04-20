# ✅ Migration Checklist

Copy this checklist and mark each item as you complete it!

---

## 📋 Pre-Migration

- [ ] Backup your database (if you have important data)
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Have all migration files ready

---

## 🚀 Run Migrations (In Order)

### Phase 1: RBAC Setup
- [ ] **1.** Run `20260420235959_prepare_for_rbac.sql` ⭐ NEW!
- [ ] **2.** Run `20260421000000_rbac_system.sql`
- [ ] **3.** Run `20260421000000_5_restore_admins.sql` ⭐ NEW!

### Phase 2: Core Features
- [ ] **4.** Run `20260421000001_lms_and_courses.sql`
- [ ] **5.** Run `20260421000002_freelancing_and_help.sql`
- [ ] **6.** Run `20260421000003_email_verification.sql`

### Phase 3: Advanced Features
- [ ] **7.** Run `20260421000004_live_sports_booking.sql`
- [ ] **8.** Run `20260421000005_college_specific_config.sql`
- [ ] **9.** Run `20260421000006_daily_challenges_compiler.sql`

### Phase 4: Gamification & Admin
- [ ] **10.** Run `20260421000007_gamification_streaks.sql`
- [ ] **11.** Run `20260421000008_multi_level_admins.sql`

### Phase 5: Final Touches
- [ ] **12.** Run `20260421000009_improved_server_system.sql`
- [ ] **13.** Run `20260421000010_final_enhancements.sql`

---

## ✅ Post-Migration

- [ ] All migrations completed without errors
- [ ] Create admin user: `SELECT promote_to_admin_level('your-email', 'super_admin');`
- [ ] Verify admin exists: Check `user_roles` table
- [ ] Test a few queries (see QUICK_REFERENCE.md)

---

## 🎯 Verification Queries

Run these to verify everything works:

```sql
-- 1. Count tables (should be 65+)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Check admin user
SELECT u.email, ur.role, ur.admin_level
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

-- 3. Check sports facilities
SELECT COUNT(*) FROM sports_facilities;

-- 4. Check daily challenges
SELECT COUNT(*) FROM daily_words;
SELECT COUNT(*) FROM coding_problems;

-- 5. Check gamification
SELECT COUNT(*) FROM badges;
SELECT COUNT(*) FROM achievements;

-- 6. Check servers
SELECT kind, COUNT(*) FROM servers GROUP BY kind;
```

---

## 🎉 Success Criteria

All of these should be true:

- [ ] ✅ 65+ tables exist
- [ ] ✅ Admin user created
- [ ] ✅ Sports facilities table has data
- [ ] ✅ Daily challenges tables have data
- [ ] ✅ Badges and achievements exist
- [ ] ✅ Servers table has college/global/group types
- [ ] ✅ No errors in any migration

---

## 🚀 Next Steps

- [ ] Push to Git
- [ ] Build remaining UI components
- [ ] Test features in the app
- [ ] Deploy to production
- [ ] Launch! 🎊

---

## 📝 Notes

Write any errors or issues you encounter here:

```
[Your notes here]
```

---

**Status**: ⏳ In Progress
**Started**: _____________
**Completed**: _____________
**Total Time**: _____________

---

**When done, tell me and I'll help you push to Git!** 🚀
