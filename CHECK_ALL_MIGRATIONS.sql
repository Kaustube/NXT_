-- =========================
-- CHECK ALL MIGRATIONS STATUS
-- Run this to see if all migrations from April 16 onwards are working
-- =========================

SELECT '========================================' as check_section;
SELECT '🔍 CHECKING ALL MIGRATIONS' as check_section;
SELECT '========================================' as check_section;

-- ============================================
-- 1. ORIGINAL SCHEMA (April 16)
-- ============================================

SELECT '' as check_section;
SELECT '📋 1. ORIGINAL SCHEMA (April 16)' as check_section;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'colleges') 
    THEN '✅ colleges' ELSE '❌ colleges MISSING' END as status
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
    THEN '✅ profiles' ELSE '❌ profiles MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'servers') 
    THEN '✅ servers' ELSE '❌ servers MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channels') 
    THEN '✅ channels' ELSE '❌ channels MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'server_members') 
    THEN '✅ server_members' ELSE '❌ server_members MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_messages') 
    THEN '✅ channel_messages' ELSE '❌ channel_messages MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') 
    THEN '✅ conversations' ELSE '❌ conversations MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dm_messages') 
    THEN '✅ dm_messages' ELSE '❌ dm_messages MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') 
    THEN '✅ tasks' ELSE '❌ tasks MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') 
    THEN '✅ listings' ELSE '❌ listings MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') 
    THEN '✅ events' ELSE '❌ events MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'connections') 
    THEN '✅ connections' ELSE '❌ connections MISSING' END;

-- ============================================
-- 2. NOTIFICATIONS (April 17)
-- ============================================

SELECT '' as check_section;
SELECT '📋 2. NOTIFICATIONS (April 17)' as check_section;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
    THEN '✅ notifications' ELSE '❌ notifications MISSING' END as status
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') 
    THEN '✅ notification_preferences' ELSE '❌ notification_preferences MISSING' END;

-- ============================================
-- 3. ENHANCEMENTS (April 17)
-- ============================================

SELECT '' as check_section;
SELECT '📋 3. ENHANCEMENTS (April 17)' as check_section;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coding_challenges') 
    THEN '✅ coding_challenges' ELSE '❌ coding_challenges MISSING' END as status
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_submissions') 
    THEN '✅ challenge_submissions' ELSE '❌ challenge_submissions MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sports_bookings') 
    THEN '✅ sports_bookings' ELSE '❌ sports_bookings MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_streaks') 
    THEN '✅ user_streaks' ELSE '❌ user_streaks MISSING' END;

-- ============================================
-- 4. RBAC SYSTEM (April 21)
-- ============================================

SELECT '' as check_section;
SELECT '📋 4. RBAC SYSTEM (April 21)' as check_section;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') 
    THEN '✅ user_roles' ELSE '❌ user_roles MISSING' END as status
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'admin_level') 
    THEN '✅ user_roles has NEW structure' ELSE '❌ user_roles has OLD structure' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') 
    THEN '✅ permissions' ELSE '❌ permissions MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') 
    THEN '✅ role_permissions' ELSE '❌ role_permissions MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') 
    THEN '✅ user_role enum' ELSE '❌ user_role enum MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_level') 
    THEN '✅ admin_level enum' ELSE '❌ admin_level enum MISSING' END;

-- ============================================
-- 5. KEY FUNCTIONS
-- ============================================

SELECT '' as check_section;
SELECT '📋 5. KEY FUNCTIONS' as check_section;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') 
    THEN '✅ has_role()' ELSE '❌ has_role() MISSING' END as status
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_permission') 
    THEN '✅ has_permission()' ELSE '❌ has_permission() MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'promote_to_admin_level') 
    THEN '✅ promote_to_admin_level()' ELSE '❌ promote_to_admin_level() MISSING' END
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN '✅ handle_new_user()' ELSE '❌ handle_new_user() MISSING' END;

-- ============================================
-- 6. SERVER COLUMNS
-- ============================================

SELECT '' as check_section;
SELECT '📋 6. SERVER TABLE COLUMNS' as check_section;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servers' AND column_name = 'auto_join') 
    THEN '✅ servers.auto_join' ELSE '❌ servers.auto_join MISSING' END as status
UNION ALL
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servers' AND column_name = 'created_by') 
    THEN '✅ servers.created_by' ELSE '❌ servers.created_by MISSING' END;

-- ============================================
-- 7. DATA CHECK
-- ============================================

SELECT '' as check_section;
SELECT '📋 7. DATA CHECK' as check_section;

SELECT 'Colleges:' as info, COUNT(*) as count FROM public.colleges
UNION ALL
SELECT 'Servers:', COUNT(*) FROM public.servers
UNION ALL
SELECT 'Channels:', COUNT(*) FROM public.channels
UNION ALL
SELECT 'Profiles:', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'User Roles:', COUNT(*) FROM public.user_roles;

-- ============================================
-- 8. COLLEGES LIST
-- ============================================

SELECT '' as check_section;
SELECT '📋 8. COLLEGES IN DATABASE' as check_section;

SELECT name, short_code, email_domain FROM public.colleges ORDER BY name;

-- ============================================
-- 9. SERVERS LIST
-- ============================================

SELECT '' as check_section;
SELECT '📋 9. SERVERS IN DATABASE' as check_section;

SELECT name, kind, 
  CASE WHEN auto_join THEN 'Yes' ELSE 'No' END as auto_join
FROM public.servers ORDER BY kind, name;

-- ============================================
-- 10. ADMIN USERS
-- ============================================

SELECT '' as check_section;
SELECT '📋 10. ADMIN USERS' as check_section;

SELECT u.email, ur.role, ur.admin_level
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY u.email;

-- ============================================
-- 11. TOTAL SUMMARY
-- ============================================

SELECT '' as check_section;
SELECT '========================================' as check_section;
SELECT '📊 SUMMARY' as check_section;
SELECT '========================================' as check_section;

SELECT 
  'Total Tables' as metric,
  COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT 
  'Total Functions',
  COUNT(*)::text
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
UNION ALL
SELECT 
  'Total Enums',
  COUNT(*)::text
FROM pg_type 
WHERE typtype = 'e'
AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
UNION ALL
SELECT 
  'Total RLS Policies',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public';

SELECT '' as check_section;
SELECT '========================================' as check_section;
SELECT '✅ CHECK COMPLETE!' as check_section;
SELECT '========================================' as check_section;
