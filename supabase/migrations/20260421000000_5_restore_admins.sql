-- =========================
-- RESTORE ADMIN USERS
-- This migration restores admin users from the old system to the new RBAC system
-- Run this AFTER running 20260421000000_rbac_system.sql
-- =========================

-- Note: This migration will try to restore admin users from backup.
-- If the backup table doesn't exist or has no data, you'll need to manually create an admin.

-- Create a function to safely restore admins
CREATE OR REPLACE FUNCTION public.restore_admin_users()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT := 0;
  v_user_id UUID;
BEGIN
  -- Check if backup table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles_backup_20260420'
  ) THEN
    -- Restore admin users
    FOR v_user_id IN 
      SELECT DISTINCT user_id 
      FROM public.user_roles_backup_20260420
      WHERE role::text = 'admin'
    LOOP
      INSERT INTO public.user_roles (user_id, role, admin_level, scope_type, scope_id)
      VALUES (v_user_id, 'admin', 'super_admin', 'global', NULL)
      ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;
      
      v_count := v_count + 1;
    END LOOP;
    
    IF v_count > 0 THEN
      RETURN 'Restored ' || v_count || ' admin user(s) from backup';
    ELSE
      RETURN 'No admin users found in backup. Create one manually with: SELECT promote_to_admin_level(''your-email@example.com'', ''super_admin'');';
    END IF;
  ELSE
    RETURN 'Backup table not found. Create admin manually with: SELECT promote_to_admin_level(''your-email@example.com'', ''super_admin'');';
  END IF;
END;
$$;

-- Run the restore function
SELECT public.restore_admin_users();

-- Drop the function (we don't need it anymore)
DROP FUNCTION IF EXISTS public.restore_admin_users();

-- Note: Super admins can assign other admins using:
-- SELECT promote_to_admin_level('user-email@example.com', 'college_admin');
-- SELECT promote_to_admin_level('user-email@example.com', 'content_admin');
-- etc.
