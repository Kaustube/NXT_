# NXT – Student Super App: Project Report & Operational Manual

## 1. Project Overview
**NXT** is a comprehensive "Super App" designed for the Indian college ecosystem. It consolidates social networking, academic management, campus services, and facility booking into a single, premium dark-themed interface.

### Core Objective
To reduce "app fatigue" for students by providing a unified home for campus life—moving away from scattered WhatsApp groups and outdated college portals.

---

## 2. Technical Stack
- **Frontend**: React (Vite) with TypeScript.
- **Styling**: Vanilla CSS + Tailwind-inspired design tokens for a "Obsidian & Cyan" premium aesthetic.
- **Backend/Database**: Supabase (PostgreSQL) for real-time data, Auth, and Storage.
- **AI Engine**: Google Gemini 2.0 Flash (via Supabase Edge Functions) for academic tutoring and troubleshooting.
- **Hosting**: Vercel (Frontend) and Supabase (Backend).

---

## 3. Key Module Breakdown


### 🏛️ Athletics & Sports (New)
- **Venue Management**: Dual-mode booking (Slotted for badminton/gym, Open for football/grounds).
- **Admin Seeding**: Built-in seeder for demo venues and slots to populate the app instantly.
- **Nearby Turfs**: Support for external venue owners to list facilities via a ticketing system.


- **Course Hub**: Tracks assignments, coding challenges, and study materials.
- **Coding Compiler**: Integrated environment for daily coding practice.

### 💬 Social & Networking
- **Servers**: College-specific and interest-based chat channels.
- **Direct Messaging**: E2E encrypted style DMs for private networking.
- **Staff Directory**: Role-aware networking for admins and student leaders.

### 🛠️ Campus Services
- **Ticketing**: Centralized system for Laundry, Gate Pickup, and Maintenance.
- **Marketplace**: P2P platform for students to buy/sell/rent items on campus.

---

## 4. Operations Manual (Future Tasks)

### **A. Granting Admin Privileges**
If you need to make a user an Admin manually, run this in the Supabase SQL Editor:
```sql
-- Replace 'USER_ID' with the actual user UUID
INSERT INTO public.user_roles (user_id, role, admin_level)
VALUES ('USER_ID', 'admin', 'super_admin')
ON CONFLICT (user_id, role) DO UPDATE SET admin_level = 'super_admin';
```

### **B. Approving New Venues/Partners**
1. Log in as an Admin.
2. Go to the **Admin Panel** via the Sidebar.
3. Use the **Sports Management** or **Partner Approvals** tab.
4. Set status to **Approved** to make them live.

### **C. AI Troubleshooting**
If the AI stops responding:
1. Ensure the `GEMINI_API_KEY` is set in the Supabase Vault/Secrets.
2. Check the Edge Function logs in the Supabase Dashboard under `Functions -> ai-chat`.

### **D. Database Maintenance**
To clear old/stale bookings or notifications:
```sql
DELETE FROM public.sports_bookings WHERE booking_date < CURRENT_DATE;
```

---

## 5. Troubleshooting Guide for Users
If a user reports "I can't see my name" or "It's loading forever":
1. **Force Sync**: Tell them to click the **Refresh Icon** in the bottom-left Sidebar.
2. **Hard Refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows).
3. **Clear Cache**: Use the **"Need Help?"** link on the Login page to clear site data.

---

## 6. Future Roadmap
- **Payment Integration**: Link the Marketplace to UPI for instant student-to-student payments.
- **Live Event Streaming**: Integrate WebRTC for hosting workshops directly inside Servers.
- **Advanced LMS**: AI-generated quiz banks based on uploaded PDFs.

---
**Report Generated on**: April 30, 2026
**Lead AI Architect**: Antigravity (Google DeepMind)
