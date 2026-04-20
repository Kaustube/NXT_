# NXT Campus - Setup Guide

## 🚀 Quick Start

### 1. Apply Database Migrations

Run the new migrations in order:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard → SQL Editor
# Run each migration file in order:
# 1. 20260421000000_rbac_system.sql
# 2. 20260421000001_lms_and_courses.sql
# 3. 20260421000002_freelancing_and_help.sql
# 4. 20260421000003_email_verification.sql
```

### 2. Create Your First Admin

```sql
-- In Supabase SQL Editor
SELECT promote_to_admin('your-email@example.com');
```

### 3. Install Dependencies (if needed)

```bash
npm install
# or
bun install
```

### 4. Start Development Server

```bash
npm run dev
# or
bun dev
```

---

## 📋 Post-Migration Checklist

### Database Setup
- [ ] All migrations applied successfully
- [ ] At least one admin user created
- [ ] Test user roles are working
- [ ] RLS policies are active

### Feature Testing
- [ ] Login/Signup works
- [ ] Dashboard loads correctly
- [ ] Email verification flow works
- [ ] Help page accessible at `/help`
- [ ] Admin panel accessible for admin users

### Configuration Needed
- [ ] Email service setup (for verification emails)
- [ ] AI API key (for chatbot - OpenAI/Claude)
- [ ] File storage bucket (for course videos/attachments)
- [ ] Payment gateway (for paid courses/freelancing)

---

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```env
# Existing Supabase config
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# New: Email Service (optional - for verification emails)
VITE_EMAIL_SERVICE_API_KEY=your-email-api-key

# New: AI Service (optional - for chatbot)
VITE_OPENAI_API_KEY=your-openai-key
# or
VITE_ANTHROPIC_API_KEY=your-claude-key
```

### Supabase Storage Buckets

Create these buckets in Supabase Dashboard → Storage:

1. **course-videos** - For course video content
   - Public: No
   - File size limit: 500MB
   - Allowed MIME types: video/*

2. **course-materials** - For course attachments
   - Public: No
   - File size limit: 50MB
   - Allowed MIME types: application/pdf, image/*, etc.

3. **profile-avatars** - For user avatars
   - Public: Yes
   - File size limit: 5MB
   - Allowed MIME types: image/*

---

## 👥 User Role Management

### Creating Different Role Types

```sql
-- Create Admin (full system access)
SELECT promote_to_admin('admin@example.com');

-- Create Professor (LMS management)
SELECT promote_to_professor('professor@example.com');

-- Create Server Admin (for specific server)
SELECT assign_server_role(
  'user@example.com',
  'server-uuid-here',
  'server_admin'
);

-- Create Server Moderator
SELECT assign_server_role(
  'user@example.com',
  'server-uuid-here',
  'server_mod'
);
```

### Checking User Roles

```sql
-- View all roles for a user
SELECT * FROM user_roles WHERE user_id = 'user-uuid';

-- View all admins
SELECT u.email, ur.role, ur.scope_type
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role IN ('admin', 'professor', 'server_admin');
```

---

## 🎓 LMS Setup

### Creating Your First Course

1. Navigate to `/lms` (or create a dedicated course creation page)
2. As a professor or admin, create a course
3. Add modules (sections)
4. Add lessons to modules
5. Publish the course

### Database Example:

```sql
-- Insert a sample course
INSERT INTO courses (
  title,
  slug,
  description,
  instructor_id,
  category,
  level,
  status,
  is_official
) VALUES (
  'Introduction to Web Development',
  'intro-web-dev',
  'Learn HTML, CSS, and JavaScript basics',
  'instructor-user-id',
  'programming',
  'beginner',
  'published',
  true
);
```

---

## 💼 Freelancing Platform Setup

### Enabling Freelancing

1. Users can create freelancer profiles at `/opportunities`
2. Post gigs or browse existing ones
3. Submit proposals
4. Track gig status

### Sample Gig:

```sql
INSERT INTO freelance_gigs (
  poster_id,
  title,
  description,
  category,
  budget_min,
  budget_max,
  status
) VALUES (
  'user-id',
  'Build a Landing Page',
  'Need a responsive landing page for my startup',
  'web-dev',
  5000,
  10000,
  'open'
);
```

---

## 📧 Email Verification Setup

### Option 1: Supabase Edge Function (Recommended)

Create an edge function to send verification emails:

```typescript
// supabase/functions/send-verification-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { email, code } = await req.json()
  
  // Use your email service (SendGrid, Resend, etc.)
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email }],
        subject: 'Verify your NXT Campus email',
      }],
      from: { email: 'noreply@nxtcampus.com' },
      content: [{
        type: 'text/html',
        value: `Your verification code is: <strong>${code}</strong>`,
      }],
    }),
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Option 2: Client-Side Email Service

Update `src/components/EmailVerification.tsx` to call your email API.

---

## 🤖 AI Chatbot Integration

### Option 1: OpenAI

```typescript
// src/lib/ai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // For client-side (not recommended for production)
});

export async function getChatResponse(messages: Array<{role: string; content: string}>) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages as any,
  });
  
  return response.choices[0].message.content;
}
```

### Option 2: Anthropic Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
});

export async function getChatResponse(messages: Array<{role: string; content: string}>) {
  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1024,
    messages: messages as any,
  });
  
  return response.content[0].text;
}
```

Then update `src/pages/Help.tsx` to use the real API instead of mock responses.

---

## 📱 Mobile Optimization TODO

### Priority Components to Optimize:

1. **Navigation** (`src/components/AppLayout.tsx`)
   - Add hamburger menu for mobile
   - Collapse sidebar on mobile

2. **Dashboard** (`src/pages/Dashboard.tsx`)
   - Stack stats vertically on mobile
   - Make calendar responsive

3. **LMS Pages**
   - Card layout for courses on mobile
   - Full-screen video player

4. **Freelancing**
   - Card-based gig listing
   - Stack proposal form fields

5. **Help Page**
   - Full-screen chat on mobile
   - Collapsible FAQ sections

### Implementation Pattern:

```typescript
import { useIsMobile } from "@/hooks/use-mobile";

export default function Component() {
  const isMobile = useIsMobile();
  
  return (
    <div className={isMobile ? "mobile-layout" : "desktop-layout"}>
      {/* Content */}
    </div>
  );
}
```

---

## 🔍 Troubleshooting

### Issue: Dashboard not loading after login

**Solution:**
1. Check browser console for errors
2. Verify user session is established
3. Check RLS policies are not blocking queries
4. Ensure `user_roles` table has entry for user

```sql
-- Check user roles
SELECT * FROM user_roles WHERE user_id = 'your-user-id';

-- If missing, add member role
INSERT INTO user_roles (user_id, role, scope_type)
VALUES ('your-user-id', 'member', 'global');
```

### Issue: Email verification not sending

**Solution:**
1. Check if verification code is being generated (check `email_verifications` table)
2. Set up email service (see Email Verification Setup above)
3. For testing, retrieve code directly from database:

```sql
SELECT code FROM email_verifications
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

### Issue: Permission denied errors

**Solution:**
1. Check user has appropriate role
2. Verify RLS policies are correct
3. Check function permissions

```sql
-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION has_scoped_permission TO authenticated;
```

---

## 📊 Monitoring & Analytics

### Useful Queries

```sql
-- Active users today
SELECT COUNT(DISTINCT user_id) 
FROM channel_messages 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Most popular courses
SELECT c.title, COUNT(ce.id) as enrollments
FROM courses c
LEFT JOIN course_enrollments ce ON ce.course_id = c.id
GROUP BY c.id, c.title
ORDER BY enrollments DESC
LIMIT 10;

-- Support ticket stats
SELECT status, COUNT(*) 
FROM support_tickets 
GROUP BY status;

-- Freelancing activity
SELECT status, COUNT(*) 
FROM freelance_gigs 
GROUP BY status;
```

---

## 🎯 Next Steps

1. **Complete Mobile UI** - Highest priority
2. **Integrate Real AI** - Replace mock chatbot
3. **Setup Email Service** - Enable verification emails
4. **Add File Uploads** - For courses and profiles
5. **Payment Integration** - For paid courses
6. **Testing** - Comprehensive testing of all features
7. **Documentation** - User-facing documentation
8. **Performance** - Optimize queries and loading

---

## 📞 Support

For issues or questions:
1. Check `FEATURES.md` for feature documentation
2. Review Supabase logs for errors
3. Check browser console for client-side errors
4. Review RLS policies if permission errors occur

---

## 🎉 You're All Set!

Your NXT Campus platform now has:
- ✅ Role-based access control
- ✅ Full LMS with user-generated courses
- ✅ Freelancing platform
- ✅ Help & support system with AI chatbot
- ✅ Email verification
- ✅ Enhanced authentication

Happy building! 🚀
