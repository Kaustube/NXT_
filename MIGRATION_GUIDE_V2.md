# 🚀 Migration Guide - Startup Features V2

## Overview

This guide will help you apply all the new startup-level features to your NXT Campus platform.

---

## 📋 Pre-Migration Checklist

- [ ] Backup your database
- [ ] Note your current admin users
- [ ] Check Supabase project is accessible
- [ ] Have SQL Editor ready

---

## 🔄 Migration Steps

### Step 1: Apply Previous Migrations (if not done)

```bash
# Apply migrations 1-3 first
supabase db push

# Or manually apply:
# 1. 20260421000000_rbac_system.sql
# 2. 20260421000001_lms_and_courses.sql
# 3. 20260421000002_freelancing_and_help.sql
# 4. 20260421000003_email_verification.sql
```

### Step 2: Apply New Startup Features

```bash
# Apply new migrations 4-8
supabase db push

# Or manually in Supabase SQL Editor:
```

#### Migration 4: Live Sports Booking
**File**: `supabase/migrations/20260421000004_live_sports_booking.sql`

**What it adds**:
- Sports facilities management
- Time slot configuration
- Real-time booking system
- Auto-expiry for past slots

**Seed data**: Basketball court, Tennis court, Gym for Bennett University

#### Migration 5: College-Specific Config
**File**: `supabase/migrations/20260421000005_college_specific_config.sql`

**What it adds**:
- College configuration table
- Departments
- Course categories
- Academic calendar

**Seed data**: 6 departments and 6 course categories for Bennett

#### Migration 6: Daily Challenges & Compiler
**File**: `supabase/migrations/20260421000006_daily_challenges_compiler.sql`

**What it adds**:
- Daily word of the day
- Coding problems (LeetCode style)
- Test prep questions (GMAT, GRE, CAT, SAT, etc.)
- Random facts
- Code submission tracking

**Seed data**: 
- 3 daily words
- 1 coding problem
- 3 test prep questions
- 5 random facts

#### Migration 7: Gamification & Streaks
**File**: `supabase/migrations/20260421000007_gamification_streaks.sql`

**What it adds**:
- Enhanced streak system
- XP and levels
- Badges (11 pre-defined)
- Achievements (7 pre-defined)
- Leaderboards (5 types)
- Daily activity tracking

**Seed data**: 11 badges, 7 achievements, 5 leaderboards

#### Migration 8: Multi-Level Admins
**File**: `supabase/migrations/20260421000008_multi_level_admins.sql`

**What it adds**:
- 7 admin levels
- Admin activity logging
- Admin teams
- Moderation queue
- System settings

**Seed data**: System settings, permission matrix

---

### Step 3: Verify Migration Success

```sql
-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'sports_facilities',
  'college_config',
  'daily_words',
  'coding_problems',
  'user_xp',
  'badges',
  'admin_activity_log'
);

-- Should return 7 rows

-- Check seed data
SELECT COUNT(*) FROM sports_facilities; -- Should be 3
SELECT COUNT(*) FROM badges; -- Should be 11
SELECT COUNT(*) FROM achievements; -- Should be 7
SELECT COUNT(*) FROM daily_words; -- Should be 3
SELECT COUNT(*) FROM knowledge_facts; -- Should be 5
```

---

### Step 4: Create Admin Users

```sql
-- Create Super Admin (full access)
SELECT promote_to_admin_level('your-email@example.com', 'super_admin');

-- Create Content Admin (for managing courses/problems)
SELECT promote_to_admin_level('content@example.com', 'content_admin');

-- Create Support Admin (for handling tickets)
SELECT promote_to_admin_level('support@example.com', 'support_admin');

-- Create Sports Admin (for managing facilities)
SELECT promote_to_admin_level('sports@example.com', 'sports_admin');
```

---

### Step 5: Configure Your College

```sql
-- Get your college ID
SELECT id, name FROM colleges;

-- Update college config (replace with your college ID)
UPDATE college_config
SET 
  allow_student_courses = true,
  sports_booking_advance_days = 7,
  sports_cancellation_hours = 2,
  freelancing_enabled = true,
  marketplace_enabled = true
WHERE college_id = 'your-college-id';
```

---

### Step 6: Initialize User Data

```sql
-- Initialize XP for existing users
INSERT INTO user_xp (user_id, total_xp, level)
SELECT id, 0, 1 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Initialize streaks for existing users
INSERT INTO user_streaks (user_id, current_streak, longest_streak)
SELECT id, 0, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

---

## 🧪 Testing

### Test 1: Sports Booking

```sql
-- View available facilities
SELECT * FROM sports_facilities;

-- View time slots for a facility
SELECT * FROM facility_time_slots 
WHERE facility_id = 'facility-id-here'
ORDER BY day_of_week, start_time;

-- Check slot availability
SELECT is_slot_available(
  'facility-id',
  CURRENT_DATE + 1,
  '16:00'::TIME,
  'time-slot-id'
);
```

### Test 2: Daily Challenges

```sql
-- Get today's word
SELECT * FROM get_todays_word();

-- Get today's coding problem
SELECT * FROM get_todays_problem();

-- Get random fact
SELECT * FROM get_random_fact();
```

### Test 3: Gamification

```sql
-- Award XP to a user
SELECT award_xp(
  'user-id',
  50,
  'Solved first problem',
  'coding',
  NULL
);

-- Check user XP
SELECT * FROM user_xp WHERE user_id = 'user-id';

-- Update user streak
SELECT update_user_streak('user-id');

-- Check streak
SELECT * FROM user_streaks WHERE user_id = 'user-id';
```

### Test 4: Admin System

```sql
-- Check admin level
SELECT has_admin_level('user-id', 'super_admin');

-- Log admin action
SELECT log_admin_action(
  'admin-id',
  'created_facility',
  'facility',
  'facility-id',
  '{"name": "New Court"}'::jsonb
);

-- View admin logs
SELECT * FROM admin_activity_log 
WHERE admin_id = 'admin-id'
ORDER BY created_at DESC;
```

---

## 🔧 Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution**: Drop the conflicting table and re-run:
```sql
DROP TABLE IF EXISTS table_name CASCADE;
-- Then re-run the migration
```

### Issue: Seed data not appearing

**Solution**: Check if college exists:
```sql
SELECT * FROM colleges WHERE short_code = 'BU';
-- If missing, insert it first
```

### Issue: Functions not working

**Solution**: Grant execute permissions:
```sql
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

### Issue: RLS blocking queries

**Solution**: Check user roles:
```sql
SELECT * FROM user_roles WHERE user_id = 'your-user-id';
-- Ensure user has at least 'member' role
```

---

## 📊 Post-Migration Verification

### Database Health Check

```sql
-- Count all tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Should be 60+ tables

-- Count all functions
SELECT COUNT(*) FROM information_schema.routines 
WHERE routine_schema = 'public';
-- Should be 40+ functions

-- Count all policies
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'public';
-- Should be 150+ policies

-- Check for any missing indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Feature Verification

- [ ] Sports facilities visible
- [ ] Time slots configured
- [ ] Daily word available
- [ ] Coding problem available
- [ ] Badges defined
- [ ] Achievements defined
- [ ] Leaderboards created
- [ ] Admin levels working
- [ ] College config exists
- [ ] System settings defined

---

## 🎯 Next Steps After Migration

### 1. UI Development Priority

1. **Sports Booking UI** (High Priority)
   - Facility browser
   - Calendar with available slots
   - Booking form

2. **Daily Challenges Dashboard** (High Priority)
   - Word of the day card
   - Coding problem widget
   - Test prep question

3. **Gamification UI** (Medium Priority)
   - XP progress bar
   - Badge showcase
   - Leaderboard tables

4. **Admin Dashboard** (Medium Priority)
   - Activity log viewer
   - Moderation queue
   - System settings

### 2. Integration Setup

1. **Code Execution API**
   - Sign up for Judge0 or Piston
   - Add API key to `.env`
   - Implement submission handler

2. **Email Service** (if not done)
   - Configure SendGrid/Resend
   - Set up email templates
   - Test verification emails

3. **AI Service** (if not done)
   - Add OpenAI/Claude API key
   - Implement chatbot backend
   - Test responses

### 3. Content Population

1. **Add More Daily Words**
   ```sql
   INSERT INTO daily_words (date, word, definition, ...)
   VALUES (...);
   ```

2. **Add More Coding Problems**
   ```sql
   INSERT INTO coding_problems (title, description, ...)
   VALUES (...);
   ```

3. **Add More Test Prep Questions**
   ```sql
   INSERT INTO test_prep_questions (test_type, question, ...)
   VALUES (...);
   ```

4. **Add More Random Facts**
   ```sql
   INSERT INTO knowledge_facts (category, fact, ...)
   VALUES (...);
   ```

---

## 📈 Monitoring

### Key Metrics to Track

```sql
-- Daily active users
SELECT COUNT(DISTINCT user_id) 
FROM user_daily_activity 
WHERE activity_date = CURRENT_DATE;

-- Problems solved today
SELECT SUM(problems_solved) 
FROM user_daily_activity 
WHERE activity_date = CURRENT_DATE;

-- Sports bookings today
SELECT COUNT(*) 
FROM sports_bookings 
WHERE booking_date = CURRENT_DATE;

-- XP earned today
SELECT SUM(xp_earned) 
FROM user_daily_activity 
WHERE activity_date = CURRENT_DATE;

-- New badges earned today
SELECT COUNT(*) 
FROM user_badges 
WHERE earned_at::DATE = CURRENT_DATE;
```

---

## 🎉 Success!

If all steps completed successfully, you now have:

✅ Live sports booking system
✅ College-specific configurations
✅ Daily challenges (word, coding, test prep)
✅ Code compiler foundation
✅ Full gamification system
✅ Multi-level admin system
✅ Enhanced streaks and XP
✅ Badges and achievements
✅ Leaderboards
✅ Random facts

**Your platform is now startup-ready!** 🚀

---

## 📞 Support

If you encounter issues:
1. Check `STARTUP_FEATURES.md` for feature details
2. Review `IMPLEMENTATION_SUMMARY.md` for known issues
3. Check Supabase logs for errors
4. Verify RLS policies are not blocking queries

---

**Migration Version**: 2.0
**Last Updated**: April 21, 2026
**Total New Tables**: 25
**Total New Functions**: 15+
**Total New Permissions**: 10+
