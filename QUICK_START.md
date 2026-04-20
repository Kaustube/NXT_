# 🚀 Quick Start Guide

## Get Up and Running in 5 Minutes

### Step 1: Apply Database Migrations (2 min)

```bash
# Option A: Using Supabase CLI (recommended)
supabase db push

# Option B: Manual (see scripts/setup-database.md)
# Copy each migration file to Supabase SQL Editor and run
```

### Step 2: Create Admin User (30 sec)

In Supabase SQL Editor:
```sql
SELECT promote_to_admin('your-email@example.com');
```

### Step 3: Start Dev Server (30 sec)

```bash
npm run dev
# or
bun dev
```

### Step 4: Login & Test (2 min)

1. Navigate to `http://localhost:5173`
2. Login with your admin account
3. Check these pages work:
   - `/` - Dashboard ✅
   - `/help` - Help & Support ✅
   - `/verify-email` - Email Verification ✅
   - `/admin` - Admin Panel ✅

---

## ✅ What's Working Right Now

### Fully Functional:
- ✅ **Login/Signup** - Enhanced with role support
- ✅ **Dashboard** - Faster loading (3s timeout)
- ✅ **Help Page** - FAQ, AI chatbot (mock), support tickets
- ✅ **Email Verification** - Page and banner (needs email service)
- ✅ **Admin Panel** - Role-based access
- ✅ **RBAC System** - 5 role types, 25+ permissions

### Database Ready (Needs UI):
- 📊 **LMS** - Full schema, needs course creation UI
- 💼 **Freelancing** - Full schema, needs gig posting UI
- 🎓 **Courses** - Can create via SQL, needs UI
- 💰 **Gigs** - Can create via SQL, needs UI

---

## 🎯 Your Next 3 Tasks

### Task 1: Test Core Features (5 min)
```bash
# Login as admin
# Visit /help - should see FAQ and chatbot
# Visit /verify-email - should see verification page
# Visit /admin - should have access
```

### Task 2: Create Test Data (5 min)
```sql
-- Create a test course
INSERT INTO courses (
  title, slug, description, instructor_id, 
  category, level, status
) VALUES (
  'Test Course', 'test-course', 'A test course',
  'your-user-id', 'programming', 'beginner', 'published'
);

-- Create a test gig
INSERT INTO freelance_gigs (
  poster_id, title, description, category, 
  budget_min, budget_max, status
) VALUES (
  'your-user-id', 'Test Gig', 'A test freelance gig',
  'web-dev', 5000, 10000, 'open'
);
```

### Task 3: Choose Your Priority (Pick One)

**Option A: Mobile UI** (Recommended)
- Add responsive navigation
- Optimize Dashboard for mobile
- Make Help page mobile-friendly

**Option B: LMS UI**
- Create course creation page
- Build course listing page
- Add enrollment interface

**Option C: Integrations**
- Set up email service (SendGrid/Resend)
- Integrate AI API (OpenAI/Claude)
- Configure storage buckets

---

## 📱 Quick Mobile Test

```bash
# Test on mobile viewport
# Chrome DevTools: Cmd+Shift+M (Mac) or Ctrl+Shift+M (Windows)
# Test these pages:
# - Dashboard
# - Help
# - Messages
# - Profile
```

---

## 🔧 Quick Fixes

### Dashboard Not Loading?
```sql
-- Ensure user has member role
INSERT INTO user_roles (user_id, role, scope_type)
VALUES ('your-user-id', 'member', 'global')
ON CONFLICT DO NOTHING;
```

### Can't Access Admin Panel?
```sql
-- Verify admin role
SELECT * FROM user_roles 
WHERE user_id = 'your-user-id' AND role = 'admin';

-- If missing, add it
SELECT promote_to_admin('your-email@example.com');
```

### Email Verification Code?
```sql
-- Get code from database (for testing)
SELECT code FROM email_verifications
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📚 Documentation Quick Links

- **Features**: See `FEATURES.md` for detailed feature docs
- **Setup**: See `SETUP_GUIDE.md` for complete setup
- **Summary**: See `IMPLEMENTATION_SUMMARY.md` for overview
- **Database**: See `scripts/setup-database.md` for migration help

---

## 🎨 UI Components Available

### Ready to Use:
```typescript
// Help page with tabs
import Help from "@/pages/Help";

// Email verification
import { EmailVerificationPage, EmailVerificationBanner } from "@/components/EmailVerification";

// Auth context with roles
const { isAdmin, isProfessor, roles, emailVerified } = useAuth();

// UI components (shadcn/ui)
import { Button, Card, Input, Textarea, Select, Tabs, Accordion } from "@/components/ui/*";
```

---

## 🚦 Status Dashboard

| Feature | Status | Action Needed |
|---------|--------|---------------|
| RBAC | 🟢 Live | None |
| Auth | 🟢 Live | None |
| Dashboard | 🟢 Live | Mobile optimization |
| Help Page | 🟢 Live | AI API integration |
| Email Verify | 🟡 Partial | Email service |
| LMS | 🟡 Backend | Build UI |
| Freelancing | 🟡 Backend | Build UI |
| Mobile UI | 🔴 Needed | Implement responsive design |

---

## 💡 Pro Tips

1. **Use the Auth Context**
   ```typescript
   const { isAdmin, roles } = useAuth();
   if (isAdmin) {
     // Show admin features
   }
   ```

2. **Check Permissions**
   ```sql
   -- In database
   SELECT has_permission('user-id', 'lms.course.create');
   ```

3. **Test with Multiple Roles**
   ```sql
   -- Create test users with different roles
   SELECT promote_to_professor('prof@example.com');
   SELECT assign_server_role('mod@example.com', 'server-id', 'server_mod');
   ```

4. **Use React Query**
   ```typescript
   const { data: courses } = useQuery({
     queryKey: ["courses"],
     queryFn: async () => {
       const { data } = await supabase.from("courses").select("*");
       return data;
     },
   });
   ```

---

## 🎉 You're Ready!

Your platform now has:
- ✅ Multi-role permission system
- ✅ LMS infrastructure
- ✅ Freelancing marketplace
- ✅ Help & support system
- ✅ Email verification
- ✅ Enhanced authentication

**Next**: Pick a priority (Mobile UI, LMS UI, or Integrations) and start building! 🚀

---

## 🆘 Need Help?

1. Check browser console for errors
2. Check Supabase logs for backend errors
3. Review `IMPLEMENTATION_SUMMARY.md` for known issues
4. Check RLS policies if permission errors occur

---

## 📊 Quick Stats

```sql
-- See your platform stats
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM courses) as total_courses,
  (SELECT COUNT(*) FROM freelance_gigs) as total_gigs,
  (SELECT COUNT(*) FROM support_tickets) as total_tickets;
```

Happy building! 🎨
