# NXT

A super app built for college students. One place for everything — servers, chats, tasks, marketplace, events, games, learning, and more.

**Course:** Design Thinking and Innovation — CSET210
**By:** Kaustubh Singh (S24CSEU1380) · Atharv Kundu (S24CSEU0016) · Aryan Parmar (S24CSEU1409)
**Institution:** Bennett University, B.Tech CSE

---

## Table of Contents

- [What's inside](#whats-inside)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [How Everything Connects](#how-everything-connects)
- [Feature Deep Dive](#feature-deep-dive)
- [Running locally](#running-locally)

---

## What's inside

| Module | What it does |
|--------|-------------|
| **Dashboard** | Personal task manager, mini calendar with due-date markers, activity feed, and stats (open tasks, messages sent, events joined, connections) |
| **Servers** | Discord-style community servers (college-specific + global). Text and voice channels, real-time chat, member list, join/leave |
| **Messages** | One-on-one direct messaging with real-time delivery. Start a DM from any user's profile in Network |
| **Network** | Find people by name, username, or skill. Filter by your college or connected-only. Send/accept connection requests |
| **Marketplace** | Post and browse buy/sell/rent listings. Restrict visibility to your college. Message sellers directly |
| **Events** | Hackathons, codeathons, daily challenges. View upcoming events and register/unregister with one tap |
| **Learn** | Curated course tracks and handpicked YouTube resources for self-paced learning |
| **LMS** | Learning Management System view — course material and academic content |
| **Games** | Wordle, Tic Tac Toe, Quiz, Memory — built-in browser games for breaks |
| **Sports** | College sports updates and scores |
| **Opportunities** | Browse internships, full-time jobs, and certifications — each with detailed requirements, stipend/salary, deadlines and direct apply links. Filterable by category and tags |
| **Placement Dashboard** | Interactive placement readiness tracker (checklist across Resume, DSA, Projects, Core CS, System Design) with a live score. Study Abroad tab covers Germany, France, USA, Canada — costs, exams, scholarships, and work permits |
| **Languages** | Duolingo-style language learning with German, French, IELTS prep, and SAT prep. Each track has 4 lesson modules with multiple-choice quizzes, XP tracking, and per-track progress |
| **Profile** | Set your bio, skills, and interests. Others can discover you in Network |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.x | UI library — component tree, hooks, context |
| **TypeScript** | 5.8.x | Static typing throughout the entire codebase |
| **Vite** | 5.4.x | Build tool and dev server (port 8080). Uses `@vitejs/plugin-react-swc` for fast SWC-based transpilation |
| **React Router v6** | 6.30.x | Client-side routing with nested routes and layout wrappers |
| **TanStack Query** | 5.83.x | Server state management — fetching, caching, and synchronisation of async data |
| **Tailwind CSS** | 3.4.x | Utility-first CSS. Custom design tokens via CSS variables (HSL-based theming) |
| **shadcn/ui** | — | Accessible headless component library built on Radix UI primitives |
| **Radix UI** | Various | Unstyled, accessible UI primitives (dialogs, dropdowns, menus, tooltips, etc.) |
| **Lucide React** | 0.462.x | Icon library |
| **date-fns** | 3.x | Date formatting and calendar calculations |
| **Recharts** | 2.15.x | Chart components (used in data visualisations) |
| **Sonner** | 1.7.x | Toast notifications |
| **React Hook Form** | 7.61.x | Form state management |
| **Zod** | 3.25.x | Schema validation (used with react-hook-form resolvers) |
| **next-themes** | 0.3.x | Theme persistence helper (light/dark mode) |
| **Embla Carousel** | 8.6.x | Carousel/slider component |
| **Vaul** | 0.9.x | Drawer component |
| **cmdk** | 1.1.x | Command palette |

### Backend / Infrastructure

| Technology | Purpose |
|------------|---------|
| **Supabase** | Fully managed backend — Postgres database, Auth, Realtime subscriptions, Row-Level Security |
| **PostgreSQL** | Relational database hosted on Supabase. All app data lives here |
| **Supabase Auth** | JWT-based authentication. Email + password sign-up/sign-in. Sessions stored in `localStorage` with auto token refresh |
| **Supabase Realtime** | WebSocket-based live subscriptions for chat messages (both channel messages and DMs) |
| **Supabase Edge Functions** | Deno-based serverless functions. `seed-demo-users` function seeds initial demo data |
| **Row-Level Security (RLS)** | Postgres policies that enforce data access at the database level — users can only read/write data they're allowed to |

### Dev Tooling

| Tool | Purpose |
|------|---------|
| **ESLint** | Linting — react-hooks and react-refresh plugins |
| **Vitest** | Unit test runner (Jest-compatible) |
| **@testing-library/react** | Component testing utilities |
| **PostCSS + Autoprefixer** | CSS post-processing for cross-browser compatibility |
| **bun** | Fast JS runtime / package manager (lockfile present alongside npm) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                   React App                      │   │
│  │                                                  │   │
│  │  ┌────────────┐  ┌───────────┐  ┌────────────┐  │   │
│  │  │QueryClient │  │AuthContext│  │ThemeContext │  │   │
│  │  │(TanStack)  │  │(Supabase) │  │(localStorage│  │   │
│  │  └────────────┘  └───────────┘  └────────────┘  │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │            React Router v6               │   │   │
│  │  │                                          │   │   │
│  │  │  /auth ──► Auth page (public)            │   │   │
│  │  │                                          │   │   │
│  │  │  RequireAuth wrapper                     │   │   │
│  │  │  └── AppLayout (sidebar + header)        │   │   │
│  │  │       ├── /           Dashboard          │   │   │
│  │  │       ├── /servers    Servers            │   │   │
│  │  │       ├── /messages   Messages           │   │   │
│  │  │       ├── /network    Network            │   │   │
│  │  │       ├── /marketplace Marketplace       │   │   │
│  │  │       ├── /events     Events             │   │   │
│  │  │       ├── /games      Games              │   │   │
│  │  │       │   ├── /games/wordle              │   │   │
│  │  │       │   ├── /games/tictactoe           │   │   │
│  │  │       │   ├── /games/quiz                │   │   │
│  │  │       │   └── /games/memory              │   │   │
│  │  │       ├── /learn      Learn              │   │   │
│  │  │       ├── /lms        LMS                │   │   │
│  │  │       ├── /sports     Sports             │   │   │
│  │  │       ├── /opportunities Opportunities  │   │   │
│  │  │       ├── /placement  Placement Dash    │   │   │
│  │  │       ├── /languages  Languages         │   │   │
│  │  │       └── /profile    Profile            │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                               │
│              Supabase JS Client                         │
│         (REST + WebSocket / Realtime)                   │
└─────────────────────────────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │       Supabase        │
              │                       │
              │  ┌─────────────────┐  │
              │  │   PostgreSQL    │  │
              │  │  (+ RLS rules)  │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │  Supabase Auth  │  │
              │  │  (JWT / email)  │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │    Realtime     │  │
              │  │  (WebSockets)   │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │  Edge Functions │  │
              │  │ (seed-demo-users│  │
              │  └─────────────────┘  │
              └───────────────────────┘
```

---

## Database Schema

The full schema lives in `supabase/migrations/`. Here is a breakdown of every table and how they relate:

### `colleges`
Stores university/college information. Used to group users, servers, and listings by institution.
- `id`, `name`, `short_code`, `email_domain`

### `profiles`
One profile per authenticated user. Created automatically after sign-up.
- `user_id` → links to Supabase Auth `auth.users`
- `college_id` → FK to `colleges`
- `display_name`, `username`, `email`, `roll_number`
- `bio`, `skills[]`, `interests[]` — editable from Profile page
- `avatar_url`

### `servers`
Community servers (like Discord servers).
- `kind`: `college` (restricted to a college) or `global` (open to all)
- `college_id` → FK to `colleges` (null for global servers)
- `slug` — URL-friendly identifier

### `channels`
Channels belong to a server.
- `server_id` → FK to `servers`
- `type`: `text` or `voice`
- `position` — ordering within the server

### `server_members`
Join table — tracks which users have joined which servers.
- `server_id` → FK to `servers`
- `user_id` → auth user

### `channel_messages`
Messages sent in server text channels.
- `channel_id` → FK to `channels`
- `author_id` → auth user
- `content`, `created_at`
- Subscribed to via Supabase Realtime (INSERT events)

### `conversations`
A unique pair of users for direct messaging. Sorted so `user_a < user_b` to avoid duplicates.
- `user_a`, `user_b` → auth users

### `dm_messages`
Messages within a conversation.
- `conversation_id` → FK to `conversations`
- `sender_id` → auth user
- `content`, `created_at`
- Subscribed to via Supabase Realtime (INSERT events)

### `connections`
Friendship/connection graph between users.
- `requester_id`, `recipient_id` → auth users
- `status`: `pending` | `accepted` | `declined`

### `events`
Platform-wide events (hackathons, codeathons, challenges).
- `kind`: `hackathon` | `codeathon` | `challenge`
- `starts_at`, `ends_at`, `location`, `cover_url`

### `event_registrations`
Tracks which users registered for which events.
- `event_id` → FK to `events`
- `user_id` → auth user

### `listings`
Marketplace listings.
- `seller_id` → auth user
- `category`: `buy` | `sell` | `rent`
- `college_id` → FK to `colleges`
- `college_only`: boolean — if true, only visible to users from the same college
- `price`, `title`, `description`, `image_url`, `active`

### `tasks`
Personal task manager entries per user.
- `user_id` → auth user
- `title`, `due_date`, `completed`, `notes`

### `user_roles`
Role assignments per user.
- `role`: `admin` | `member`

### Database Functions (RPCs)
- `is_server_member(_server, _user)` — returns boolean, used by RLS policies to check server membership before allowing message reads
- `has_role(_role, _user_id)` — returns boolean, used to check admin/member roles

---

## How Everything Connects

### Auth flow

1. User visits any route → `RequireAuth` checks `AuthContext`
2. `AuthContext` calls `supabase.auth.getSession()` on mount and subscribes to `onAuthStateChange`
3. If no session → redirect to `/auth`
4. On sign-in, Supabase returns a JWT stored in `localStorage`. The client automatically refreshes it before expiry
5. On sign-up, Supabase creates an `auth.users` record. A database trigger (or the seed function) creates a matching row in `profiles`
6. `RedirectIfAuthed` on the `/auth` route sends already-logged-in users back to `/`

### Data fetching pattern

Most pages follow the same pattern:
1. Pull `user` from `useAuth()`
2. On mount (or user change), run `Promise.all()` to fetch multiple tables in parallel from Supabase
3. Store results in local `useState`
4. Filter/sort derived data with `useMemo`
5. Mutations (insert/update/delete) call Supabase directly and then reload state

TanStack Query (`QueryClient`) is set up at the root but the heavy lifting in individual pages is done via direct Supabase calls with local state — this keeps each page self-contained.

### Realtime (WebSocket) flow

Used in two places — Servers and Messages:

```
User sends message
      │
      ▼
supabase.from("channel_messages").insert(...)
      │
      ▼
PostgreSQL row written
      │
      ▼
Supabase Realtime broadcasts INSERT event
      │
      ▼
All subscribed clients receive payload.new
      │
      ▼
setMessages(prev => [...prev, newMessage])
      │
      ▼
React re-renders, scroll to bottom
```

Each channel/conversation gets its own named Supabase channel (`ch:<channel_id>` or `dm:<conversation_id>`). Subscriptions are created in `useEffect` and cleaned up on unmount via `supabase.removeChannel()`.

### Theme system

- `ThemeProvider` wraps the entire app
- Reads initial preference from `localStorage` (key: `nxt-theme`), defaults to `dark`
- Applies `"dark"` or `"light"` class to `document.documentElement`
- Tailwind's `darkMode: ["class"]` config picks this up for all utility classes
- All colours are CSS custom properties (HSL) defined in `index.css` — there are separate variable sets for dark and light modes

### Layout system

- `AppLayout` renders the persistent sidebar (desktop) and bottom nav (mobile)
- Uses React Router's `<Outlet />` to render the active page inside
- Sidebar is conditionally hidden on mobile (`hidden md:flex`)
- Bottom nav shows the first 5 nav items on mobile
- Profile and college name in the sidebar footer are loaded live from Supabase on layout mount

### College scoping

Several features are scoped to the user's college:
- **Servers**: college servers are linked to a `college_id`; global servers are open to all
- **Marketplace**: listings can be marked `college_only`; the filter "My college only" compares `college_id`
- **Network**: "My college" filter shows only users with matching `college_id`

College info is pulled from the `profiles` table (which stores `college_id`), joined with the `colleges` table for display names.

---

## Running locally

```bash
# Install dependencies
npm install

# Copy env and fill in your Supabase URL + anon key
cp .env.example .env

# Start dev server
npm run dev
```

Opens at `http://localhost:8080`

### Environment variables

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Other scripts

```bash
npm run build          # Production build
npm run preview        # Preview production build locally
npm run lint           # ESLint
npm run test           # Run tests (Vitest)
npm run supabase:start # Start local Supabase instance
npm run supabase:stop  # Stop local Supabase instance
```

---

## Team

| Name | Enrollment No. |
|------|---------------|
| Kaustubh Singh | S24CSEU1380 |
| Atharv Kundu | S24CSEU0016 |
| Aryan Parmar | S24CSEU1409 |

B.Tech CSE, Bennett University
Course: Design Thinking and Innovation — CSET210
