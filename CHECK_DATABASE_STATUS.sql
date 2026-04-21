-- =========================
-- DATABASE STATUS CHECK
-- Run this to see what's in your database
-- =========================

-- 1. Check which tables exist
SELECT 'Tables in database:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if RBAC tables exist
SELECT 'RBAC Tables Status:' as info;
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') 
    THEN '✅ user_roles exists' 
    ELSE '❌ user_roles missing' 
  END as user_roles_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') 
    THEN '✅ permissions exists' 
    ELSE '❌ permissions missing' 
  END as permissions_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') 
    THEN '✅ role_permissions exists' 
    ELSE '❌ role_permissions missing' 
  END as role_permissions_status;

-- 3. Check if LMS tables exist
SELECT 'LMS Tables Status:' as info;
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') 
    THEN '✅ courses exists' 
    ELSE '❌ courses missing' 
  END as courses_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_modules') 
    THEN '✅ course_modules exists' 
    ELSE '❌ course_modules missing' 
  END as modules_status;

-- 4. Check if Sports tables exist
SELECT 'Sports Tables Status:' as info;
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sports_facilities') 
    THEN '✅ sports_facilities exists' 
    ELSE '❌ sports_facilities missing' 
  END as facilities_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sports_bookings') 
    THEN '✅ sports_bookings exists' 
    ELSE '❌ sports_bookings missing' 
  END as bookings_status;

-- 5. Check if Gamification tables exist
SELECT 'Gamification Tables Status:' as info;
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_xp') 
    THEN '✅ user_xp exists' 
    ELSE '❌ user_xp missing' 
  END as xp_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'badges') 
    THEN '✅ badges exists' 
    ELSE '❌ badges missing' 
  END as badges_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_streaks') 
    THEN '✅ user_streaks exists' 
    ELSE '❌ user_streaks missing' 
  END as streaks_status;

-- 6. Check if Daily Challenges tables exist
SELECT 'Daily Challenges Tables Status:' as info;
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_words') 
    THEN '✅ daily_words exists' 
    ELSE '❌ daily_words missing' 
  END as words_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coding_problems') 
    THEN '✅ coding_problems exists' 
    ELSE '❌ coding_problems missing' 
  END as problems_status;

-- 7. Check colleges
SELECT 'Colleges in database:' as info;
SELECT name, short_code, email_domain FROM public.colleges ORDER BY name;

-- 8. Check key functions
SELECT 'Key Functions Status:' as info;
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') 
    THEN '✅ has_role exists' 
    ELSE '❌ has_role missing' 
  END as has_role_status,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_permission') 
    THEN '✅ has_permission exists' 
    ELSE '❌ has_permission missing' 
  END as has_permission_status,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'promote_to_admin_level') 
    THEN '✅ promote_to_admin_level exists' 
    ELSE '❌ promote_to_admin_level missing' 
  END as promote_status;

-- 9. Count total tables
SELECT 'Total Tables Count:' as info;
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 10. Check for any errors in recent migrations
SELECT 'Recent Activity:' as info;
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename
LIMIT 10;
