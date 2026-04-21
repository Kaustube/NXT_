-- =========================
-- QUICK FIX FOR COMMON ISSUES
-- Run this if migrations are failing
-- =========================

-- 1. Check if user_roles table exists and has correct structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    -- Check if it has the new structure
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_roles' AND column_name = 'admin_level') THEN
      RAISE NOTICE '✅ user_roles has new RBAC structure';
    ELSE
      RAISE NOTICE '❌ user_roles has old structure - need to run prepare_for_rbac migration';
    END IF;
  ELSE
    RAISE NOTICE '❌ user_roles table does not exist - need to run RBAC migration';
  END IF;
END $$;

-- 2. Check if key enums exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    RAISE NOTICE '✅ user_role enum exists';
  ELSE
    RAISE NOTICE '❌ user_role enum missing - need to run RBAC migration';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_level') THEN
    RAISE NOTICE '✅ admin_level enum exists';
  ELSE
    RAISE NOTICE '❌ admin_level enum missing - need to run RBAC migration';
  END IF;
END $$;

-- 3. List all custom types/enums
SELECT 'Custom Types/Enums:' as info;
SELECT typname as enum_name
FROM pg_type 
WHERE typtype = 'e'
AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY typname;

-- 4. Check for conflicting functions
SELECT 'Functions that might conflict:' as info;
SELECT proname as function_name, 
       pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('has_role', 'promote_to_admin', 'promote_to_admin_level')
ORDER BY proname;

-- 5. Check RLS policies
SELECT 'RLS Policies Count:' as info;
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC
LIMIT 10;

-- 6. Show table sizes
SELECT 'Largest Tables:' as info;
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
