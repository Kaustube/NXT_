# 🌐 Server System V2 - Complete Guide

## Overview

The new server system provides a comprehensive solution for college servers, public servers, and user-created group chats with auto-join functionality and invite codes.

---

## 🎯 Key Features

### 1. **Auto-Join College Servers**
- Students automatically join their college server upon signup
- Email domain verification ensures correct college assignment
- No manual joining required

### 2. **Three Server Types**

#### A. College Servers 🏫
- **Visibility**: Only visible to students from that college
- **Auto-Join**: Students automatically join on signup
- **Purpose**: College-wide communication and resources
- **Management**: Managed by college admins

#### B. Public Servers 🌍
- **Visibility**: Visible to all users
- **Join**: Anyone can join freely
- **Purpose**: Interest-based communities (Coding, AI/ML, Startup, etc.)
- **Management**: Managed by platform admins

#### C. Group Chats 👥
- **Visibility**: Public or Private
- **Join**: 
  - Public: Anyone can join
  - Private: Invite-only via invite codes
- **Purpose**: Small group discussions, study groups, project teams
- **Management**: Managed by group creator (owner)

---

## 📋 Database Schema

### Enhanced `servers` Table

```sql
CREATE TABLE servers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL, -- 'college', 'global', 'group'
  college_id UUID REFERENCES colleges(id),
  description TEXT,
  
  -- New fields
  created_by UUID REFERENCES auth.users(id),
  is_private BOOLEAN NOT NULL DEFAULT false,
  max_members INT,
  invite_code TEXT UNIQUE,
  auto_join BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `server_members` Table (Enhanced)

```sql
CREATE TABLE server_members (
  id UUID PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'moderator', 'member'
  permissions JSONB DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);
```

### `server_invites` Table (New)

```sql
CREATE TABLE server_invites (
  id UUID PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id),
  code TEXT NOT NULL UNIQUE, -- 8-character code
  created_by UUID NOT NULL REFERENCES auth.users(id),
  max_uses INT, -- NULL = unlimited
  uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `server_join_requests` Table (New)

```sql
CREATE TABLE server_join_requests (
  id UUID PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);
```

---

## 🔧 Functions

### 1. Auto-Join College Server

```sql
CREATE FUNCTION auto_join_college_server()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically join user to their college server
  INSERT INTO server_members (server_id, user_id, role)
  SELECT s.id, NEW.id, 'member'
  FROM servers s
  JOIN profiles p ON p.college_id = s.college_id
  WHERE p.user_id = NEW.id
  AND s.kind = 'college'
  AND s.auto_join = true;
  
  RETURN NEW;
END;
$$;
```

### 2. Create Group Chat

```sql
SELECT create_group_chat(
  p_name := 'Study Group',
  p_description := 'CS101 study group',
  p_is_private := true,
  p_max_members := 10
);
```

**Returns**: Server ID

**What it does**:
- Creates a new group server
- Adds creator as owner
- Creates default "general" channel
- Generates invite code if private

### 3. Join with Invite Code

```sql
SELECT join_server_with_invite('ABC12345');
```

**Returns**: Server ID

**What it does**:
- Validates invite code
- Checks expiry and max uses
- Checks server max members
- Adds user to server
- Increments invite uses

### 4. Create Server Invite

```sql
SELECT create_server_invite(
  p_server_id := 'server-uuid',
  p_max_uses := 10,
  p_expires_in_hours := 168 -- 7 days
);
```

**Returns**: Invite code (8 characters)

**Requirements**: User must be server owner or admin

### 5. Request to Join Private Server

```sql
SELECT request_join_server(
  p_server_id := 'server-uuid',
  p_message := 'I would like to join this group'
);
```

**Returns**: Request ID

### 6. Review Join Request

```sql
SELECT review_join_request(
  p_request_id := 'request-uuid',
  p_approve := true
);
```

**Requirements**: User must be server owner or admin

---

## 🎨 User Flows

### Flow 1: New User Signup

```
1. User visits /auth
2. Selects college from dropdown
3. Enters email (must match college domain)
4. Completes registration
5. ✅ Automatically joined to college server
6. Redirected to dashboard
7. Can see college server in sidebar
```

### Flow 2: Create Group Chat

```
1. User clicks "Create Group Chat"
2. Enters group name and description
3. Chooses public or private
4. Sets max members (optional)
5. Clicks "Create"
6. ✅ Group created with user as owner
7. Default "general" channel created
8. User can invite others
```

### Flow 3: Join Public Server

```
1. User goes to Servers page
2. Clicks "Discover" tab
3. Sees list of public servers
4. Clicks "Join" on a server
5. ✅ Instantly joined
6. Server appears in "My Servers"
```

### Flow 4: Join Private Group with Invite

```
1. User receives invite code (e.g., ABC12345)
2. Clicks "Join with Code"
3. Enters invite code
4. Clicks "Join"
5. ✅ Joined if code is valid
6. Group appears in "My Servers"
```

### Flow 5: Invite Others to Group

```
1. User opens their group
2. Clicks "Invite" button
3. System generates invite code
4. User copies code
5. Shares code with friends
6. Friends use code to join
```

---

## 🔐 Permissions & Roles

### Server Member Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, delete server, manage all settings |
| **Admin** | Manage channels, members, invites, settings |
| **Moderator** | Delete messages, kick members, manage invites |
| **Member** | Send messages, view channels |

### Role Hierarchy

```
Owner > Admin > Moderator > Member
```

---

## 🎯 Use Cases

### 1. College Communication
**Scenario**: Bennett University wants a central hub for all students

**Solution**:
- College server auto-created
- All Bennett students auto-join on signup
- Channels: #announcements, #general, #sports, #projects
- Managed by college admins

### 2. Study Groups
**Scenario**: 5 students want a private group for CS101

**Solution**:
- Create private group chat
- Set max members to 5
- Share invite code with group members
- Only invited members can join

### 3. Interest Communities
**Scenario**: Platform wants a "Coding Community" for all users

**Solution**:
- Create public global server
- Any user can join
- Channels: #algorithms, #web-dev, #mobile-dev
- Managed by platform admins

### 4. Project Teams
**Scenario**: Hackathon team needs coordination space

**Solution**:
- Create public group chat
- Team members join freely
- Channels for different aspects
- Owner can manage team

---

## 📊 Server Visibility Matrix

| Server Type | College Students | Other Students | Visibility |
|-------------|------------------|----------------|------------|
| College Server | ✅ Auto-join | ❌ Hidden | College-only |
| Public Global | ✅ Can join | ✅ Can join | Everyone |
| Public Group | ✅ Can join | ✅ Can join | Everyone |
| Private Group | 🔑 Invite only | 🔑 Invite only | Members only |

---

## 🚀 Implementation Guide

### Step 1: Apply Migration

```bash
# Apply the new migration
supabase db push

# Or manually run:
# supabase/migrations/20260421000009_improved_server_system.sql
```

### Step 2: Update Existing Servers

```sql
-- Enable auto-join for college servers
UPDATE servers
SET auto_join = true
WHERE kind = 'college';

-- Set created_by for existing servers
UPDATE servers
SET created_by = (
  SELECT user_id FROM server_members
  WHERE server_id = servers.id
  AND role = 'owner'
  LIMIT 1
)
WHERE created_by IS NULL;
```

### Step 3: Test Auto-Join

```sql
-- Create a test user
-- They should automatically join their college server

-- Verify
SELECT s.name, sm.role
FROM servers s
JOIN server_members sm ON sm.server_id = s.id
WHERE sm.user_id = 'test-user-id';
```

### Step 4: Create Sample Group

```sql
-- Create a public group
SELECT create_group_chat(
  'Test Study Group',
  'A test group for studying',
  false,
  NULL
);

-- Create a private group
SELECT create_group_chat(
  'Private Team',
  'Private project team',
  true,
  10
);
```

### Step 5: Test Invite System

```sql
-- Generate invite for a server
SELECT create_server_invite(
  'server-id',
  10,
  168
);

-- Join with invite
SELECT join_server_with_invite('ABC12345');
```

---

## 🎨 UI Components

### Servers Page Layout

```
┌─────────────────────────────────────────┐
│  Servers                    [Join] [+]  │
├─────────────────────────────────────────┤
│  Tabs: [My Servers] [Discover]          │
├─────────────────────────────────────────┤
│                                          │
│  Your College                            │
│  ┌──────┐ ┌──────┐                      │
│  │ BU   │ │      │                      │
│  │ 1.2k │ │      │                      │
│  └──────┘ └──────┘                      │
│                                          │
│  Public Servers                          │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │Coding│ │AI/ML │ │Start │            │
│  │ 450  │ │ 320  │ │ 180  │            │
│  └──────┘ └──────┘ └──────┘            │
│                                          │
│  Group Chats                             │
│  ┌──────┐ ┌──────┐                      │
│  │Study │ │Team  │                      │
│  │  5   │ │  8   │                      │
│  └──────┘ └──────┘                      │
└─────────────────────────────────────────┘
```

### Create Group Dialog

```
┌─────────────────────────────┐
│  Create Group Chat          │
├─────────────────────────────┤
│  Group Name:                │
│  [________________]         │
│                             │
│  Description:               │
│  [________________]         │
│  [________________]         │
│                             │
│  ☐ Private (invite-only)   │
│                             │
│  Max Members (optional):    │
│  [____]                     │
│                             │
│  [Create Group]             │
└─────────────────────────────┘
```

### Join with Code Dialog

```
┌─────────────────────────────┐
│  Join with Invite Code      │
├─────────────────────────────┤
│  Enter the 8-character code │
│                             │
│  [  A  B  C  1  2  3  4  5 ]│
│                             │
│  [Join Server]              │
└─────────────────────────────┘
```

---

## 🔍 Queries

### Get User's Servers

```sql
SELECT * FROM user_servers
WHERE user_id = auth.uid()
ORDER BY kind, name;
```

### Get Public Servers Not Joined

```sql
SELECT s.*, COUNT(sm.id) as member_count
FROM servers s
LEFT JOIN server_members sm ON sm.server_id = s.id
WHERE s.kind IN ('global', 'group')
AND s.is_private = false
AND NOT EXISTS (
  SELECT 1 FROM server_members
  WHERE server_id = s.id
  AND user_id = auth.uid()
)
GROUP BY s.id
ORDER BY member_count DESC;
```

### Get Server Invites

```sql
SELECT * FROM server_invites
WHERE server_id = 'server-id'
AND (expires_at IS NULL OR expires_at > now())
AND (max_uses IS NULL OR uses < max_uses)
ORDER BY created_at DESC;
```

### Get Pending Join Requests

```sql
SELECT 
  jr.*,
  p.display_name,
  p.avatar_url
FROM server_join_requests jr
JOIN profiles p ON p.user_id = jr.user_id
WHERE jr.server_id = 'server-id'
AND jr.status = 'pending'
ORDER BY jr.created_at DESC;
```

---

## 📈 Analytics

### Server Statistics

```sql
-- Total servers by type
SELECT kind, COUNT(*) as count
FROM servers
GROUP BY kind;

-- Most popular servers
SELECT s.name, COUNT(sm.id) as members
FROM servers s
LEFT JOIN server_members sm ON sm.server_id = s.id
GROUP BY s.id, s.name
ORDER BY members DESC
LIMIT 10;

-- Group chat creation trend
SELECT DATE(created_at) as date, COUNT(*) as groups_created
FROM servers
WHERE kind = 'group'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

---

## 🎉 Benefits

### For Students
- ✅ Instant access to college community
- ✅ Easy group creation for projects
- ✅ Join interest-based communities
- ✅ Private groups for study teams

### For Colleges
- ✅ Centralized communication
- ✅ Automatic student onboarding
- ✅ Organized by departments/years
- ✅ Easy announcements

### For Platform
- ✅ Increased engagement
- ✅ Community building
- ✅ Viral growth (invite system)
- ✅ User retention

---

## 🚀 Next Steps

1. **Apply Migration** - Run the new migration
2. **Update Auth Page** - Add college selection
3. **Create Servers Page** - Build the new UI
4. **Test Auto-Join** - Verify college server auto-join
5. **Test Group Creation** - Create and join groups
6. **Test Invite System** - Generate and use invite codes

---

## 📝 Summary

The new server system provides:
- ✅ Auto-join college servers
- ✅ Public global servers
- ✅ User-created group chats
- ✅ Invite code system
- ✅ Private/public groups
- ✅ Role-based permissions
- ✅ Join request system
- ✅ Max member limits

**Status**: Ready for implementation! 🎊
