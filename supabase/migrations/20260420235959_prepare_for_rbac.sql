-- =========================
-- PREPARE FOR RBAC MIGRATION
-- This migration updates the existing user_roles table to be compatible with the new RBAC system
-- Run this BEFORE running 20260421000000_rbac_system.sql
-- =========================

-- Drop old functions that depend on user_roles (CASCADE will drop dependent policies)
DROP FUNCTION IF EXISTS public.promote_to_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;

-- Backup existing user_roles data to a permanent table
DROP TABLE IF EXISTS public.user_roles_backup_20260420;
CREATE TABLE public.user_roles_backup_20260420 AS
SELECT * FROM public.user_roles;

-- Drop the old user_roles table
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop the old app_role enum (we'll create new enums in the RBAC migration)
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Note: The new user_roles table will be created by the RBAC migration
-- This migration just cleans up the old structure
