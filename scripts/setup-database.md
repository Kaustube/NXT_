# Database Setup Instructions

## Quick Setup (Recommended)

### Using Supabase CLI:

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

### Manual Setup (Supabase Dashboard):

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order:

#### Step 1: RBAC System
Copy and paste the contents of:
`supabase/migrations/20260421000000_rbac_system.sql`

Click **Run** and wait for completion.

#### Step 2: LMS & Courses
Copy and paste the contents of:
`supabase/migrations/20260421000001_lms_and_courses.sql`

Click **Run** and wait for completion.

#### Step 3: Freelancing & Help
Copy and paste the contents of:
`supabase/migrations/20260421000002_freelancing_and_help.sql`

Click **Run** and wait for completion.

#### Step 4: Email Verification
Copy and paste the contents of:
`supabase/migrations/20260421000003_email_verification.sql`

Click **Run** and wait for completion.

---

## Post-Migration Setup

### 1. Create Your Admin Account

```sql
-- Replace with your email
SELECT promote_to_admin('your-email@example.com');
```

### 2. Verify Migration Success

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_roles',
  'permissions',
  'role_permissions',
  'courses',
  'course_modules',
  'course_lessons',
  'freelance_gigs',
  'support_tickets',
  'email_verifications'
);

-- Should return 9 rows
```

### 3. Check Your Admin Status

```sql
-- Replace with your user ID (get from auth.users table)
SELECT * FROM user_roles WHERE user_id = 'your-user-id';

-- Should show 'admin' role with 'global' scope
```

### 4. Test Permissions

```sql
-- Check if permission system is working
SELECT * FROM permissions LIMIT 5;

-- Check role-permission mappings
SELECT r.role, p.name 
FROM role_permissions r
JOIN permissions p ON p.id = r.permission_id
WHERE r.role = 'admin'
LIMIT 10;
```

---

## Troubleshooting

### Error: "relation already exists"

This means the migration was partially applied. You can either:

1. **Drop and recreate** (⚠️ This will delete all data):
```sql
-- Only do this if you're okay losing data
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
-- ... etc for all new tables
```

2. **Skip to next migration** - If one migration succeeded, move to the next

### Error: "permission denied"

Make sure you're running as a superuser or have proper permissions:
```sql
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
```

### Error: "type already exists"

```sql
-- Drop and recreate the type
DROP TYPE IF EXISTS app_role CASCADE;
-- Then re-run the migration
```

---

## Verification Checklist

After running all migrations, verify:

- [ ] All 9 new tables created
- [ ] All 12 new functions created
- [ ] RLS policies active on all tables
- [ ] At least one admin user created
- [ ] Permissions table has 25+ entries
- [ ] Role-permission mappings exist
- [ ] FAQ items seeded

---

## Next Steps

1. ✅ Migrations applied
2. ✅ Admin user created
3. → Test login with admin account
4. → Navigate to `/help` to test new features
5. → Check `/verify-email` page
6. → Review `SETUP_GUIDE.md` for next steps

---

## Quick Test Queries

```sql
-- Count new tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%course%' OR table_name LIKE '%gig%' OR table_name LIKE '%ticket%';

-- Count permissions
SELECT COUNT(*) FROM permissions;

-- Count FAQ items
SELECT COUNT(*) FROM faq_items;

-- View all roles
SELECT DISTINCT role FROM user_roles;

-- Check admin users
SELECT u.email, ur.role 
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

---

## Support

If you encounter issues:
1. Check Supabase logs for detailed error messages
2. Verify you're using PostgreSQL 14+
3. Ensure you have proper permissions
4. Review `IMPLEMENTATION_SUMMARY.md` for known issues

---

## Success! 🎉

Once all migrations are applied and you've created an admin user, you're ready to:
- Login to your account
- Access admin panel at `/admin`
- Create courses, gigs, and support tickets
- Test the new features

Refer to `FEATURES.md` for detailed feature documentation.
