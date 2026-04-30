-- Admin broadcasts use this type so they appear in admin notification log (channel_message + admin_broadcast only).
-- Run once per project. If the value already exists, skip this file in SQL Editor or ignore the error.
ALTER TYPE public.notification_type ADD VALUE 'admin_broadcast';
