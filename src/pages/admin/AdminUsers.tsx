import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Search, ShieldCheck, ShieldOff, Trash2, X, ChevronDown,
  UserCog, Check,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

type AdminLevel =
  | "super_admin"
  | "college_admin"
  | "content_admin"
  | "support_admin"
  | "sports_admin"
  | "event_admin"
  | "moderator";

type Permission =
  | "manage_users"
  | "manage_colleges"
  | "manage_servers"
  | "manage_events"
  | "manage_challenges"
  | "manage_sports"
  | "manage_lms"
  | "manage_notifications"
  | "manage_marketplace"
  | "view_analytics"
  | "moderate_content";

const ADMIN_LEVELS: { value: AdminLevel; label: string; color: string; description: string }[] = [
  { value: "super_admin",   label: "Super Admin",   color: "bg-red-500/20 text-red-400",     description: "Full access to everything" },
  { value: "college_admin", label: "College Admin", color: "bg-orange-500/20 text-orange-400", description: "Manage college-specific content" },
  { value: "content_admin", label: "Content Admin", color: "bg-yellow-500/20 text-yellow-400", description: "Manage courses, challenges, LMS" },
  { value: "event_admin",   label: "Event Admin",   color: "bg-purple-500/20 text-purple-400", description: "Create and manage events" },
  { value: "sports_admin",  label: "Sports Admin",  color: "bg-green-500/20 text-green-400",  description: "Manage sports facilities & bookings" },
  { value: "support_admin", label: "Support Admin", color: "bg-blue-500/20 text-blue-400",    description: "Handle support tickets & notifications" },
  { value: "moderator",     label: "Moderator",     color: "bg-cyan-500/20 text-cyan-400",    description: "Moderate content and messages" },
];

const ALL_PERMISSIONS: { value: Permission; label: string; description: string }[] = [
  { value: "manage_users",         label: "Manage Users",         description: "View, edit, promote, delete users" },
  { value: "manage_colleges",      label: "Manage Colleges",      description: "Add, edit, delete colleges" },
  { value: "manage_servers",       label: "Manage Servers",       description: "Create, edit, delete servers & channels" },
  { value: "manage_events",        label: "Manage Events",        description: "Create, edit, delete events" },
  { value: "manage_challenges",    label: "Manage Challenges",    description: "Create, edit coding challenges" },
  { value: "manage_sports",        label: "Manage Sports",        description: "Manage facilities and bookings" },
  { value: "manage_lms",           label: "Manage LMS",           description: "Create and manage courses" },
  { value: "manage_notifications", label: "Send Notifications",   description: "Send platform-wide notifications" },
  { value: "manage_marketplace",   label: "Manage Marketplace",   description: "Moderate listings" },
  { value: "view_analytics",       label: "View Analytics",       description: "Access platform analytics" },
  { value: "moderate_content",     label: "Moderate Content",     description: "Remove messages and content" },
];

// Default permissions per admin level
const LEVEL_DEFAULTS: Record<AdminLevel, Permission[]> = {
  super_admin:   ALL_PERMISSIONS.map(p => p.value),
  college_admin: ["manage_servers", "manage_events", "manage_lms", "manage_sports", "manage_notifications", "moderate_content", "view_analytics"],
  content_admin: ["manage_challenges", "manage_lms", "manage_events", "view_analytics"],
  event_admin:   ["manage_events", "manage_notifications", "view_analytics"],
  sports_admin:  ["manage_sports", "view_analytics"],
  support_admin: ["manage_notifications", "moderate_content", "view_analytics"],
  moderator:     ["moderate_content", "view_analytics"],
};

type UserRow = {
  user_id: string;
  display_name: string;
  username: string;
  email: string;
  college_id: string | null;
  roll_number: string | null;
  created_at: string;
  isAdmin: boolean;
  adminLevel: AdminLevel | null;
  permissions: Permission[];
  collegeName?: string;
};

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [managingUser, setManagingUser] = useState<UserRow | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<AdminLevel>("moderator");
  const [selectedPerms, setSelectedPerms] = useState<Set<Permission>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: colleges }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role, admin_level, scope_type"),
      supabase.from("colleges").select("id, short_code, name"),
    ]);

    const collegeMap: Record<string, string> = {};
    (colleges ?? []).forEach((c: any) => (collegeMap[c.id] = c.short_code));

    // Build a map of user_id → role info
    const roleMap: Record<string, { isAdmin: boolean; adminLevel: AdminLevel | null; permissions: Permission[] }> = {};
    (roles ?? []).forEach((r: any) => {
      if (!roleMap[r.user_id]) {
        roleMap[r.user_id] = { isAdmin: false, adminLevel: null, permissions: [] };
      }
      if (r.role === "admin") {
        roleMap[r.user_id].isAdmin = true;
        if (r.admin_level) roleMap[r.user_id].adminLevel = r.admin_level as AdminLevel;
      }
    });

    // Load permissions from user_roles where role = 'permission'
    const { data: permRows } = await supabase
      .from("user_roles")
      .select("user_id, scope_type")
      .eq("role", "admin");

    // For now, derive permissions from admin_level
    setUsers(
      (profiles ?? []).map((p: any) => ({
        ...p,
        isAdmin: roleMap[p.user_id]?.isAdmin ?? false,
        adminLevel: roleMap[p.user_id]?.adminLevel ?? null,
        permissions: roleMap[p.user_id]?.adminLevel
          ? LEVEL_DEFAULTS[roleMap[p.user_id].adminLevel as AdminLevel] ?? []
          : [],
        collegeName: p.college_id ? collegeMap[p.college_id] : undefined,
      }))
    );
    setLoading(false);
  }

  function openManage(u: UserRow) {
    setManagingUser(u);
    const level = u.adminLevel ?? "moderator";
    setSelectedLevel(level);
    setSelectedPerms(new Set(u.isAdmin ? (LEVEL_DEFAULTS[level] ?? []) : []));
  }

  function applyLevelDefaults(level: AdminLevel) {
    setSelectedLevel(level);
    setSelectedPerms(new Set(LEVEL_DEFAULTS[level] ?? []));
  }

  function togglePerm(p: Permission) {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function saveAdminRole() {
    if (!managingUser) return;
    setSaving(true);

    // Remove existing admin role
    await supabase.from("user_roles")
      .delete()
      .eq("user_id", managingUser.user_id)
      .eq("role", "admin");

    // Insert new admin role with level
    const { error } = await supabase.from("user_roles").insert({
      user_id: managingUser.user_id,
      role: "admin",
      admin_level: selectedLevel,
      scope_type: "global",
    });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${managingUser.display_name} is now ${ADMIN_LEVELS.find(l => l.value === selectedLevel)?.label}`);
    setManagingUser(null);
    void load();
  }

  async function removeAdmin(u: UserRow) {
    if (u.user_id === currentUser?.id) {
      toast.error("You can't remove your own admin access here.");
      return;
    }
    if (!confirm(`Remove admin access from ${u.display_name}?`)) return;
    await supabase.from("user_roles")
      .delete()
      .eq("user_id", u.user_id)
      .eq("role", "admin");
    toast.success(`Removed admin from ${u.display_name}`);
    void load();
  }

  async function deleteUser(u: UserRow) {
    if (u.user_id === currentUser?.id) {
      toast.error("You can't delete your own account");
      return;
    }
    if (!confirm(`Delete ${u.display_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("user_id", u.user_id);
    if (error) toast.error(error.message);
    else { toast.success(`Deleted ${u.display_name}`); void load(); }
  }

  const filtered = users.filter(u =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const admins = filtered.filter(u => u.isAdmin);
  const members = filtered.filter(u => !u.isAdmin);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {users.length} total · {users.filter(u => u.isAdmin).length} admins
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username or email…"
          className="w-full h-10 pl-9 pr-4 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Admins section */}
          {admins.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Admins ({admins.length})
              </h2>
              <div className="panel overflow-hidden">
                <UserTable
                  users={admins}
                  currentUserId={currentUser?.id}
                  onManage={openManage}
                  onRemoveAdmin={removeAdmin}
                  onDelete={deleteUser}
                />
              </div>
            </div>
          )}

          {/* Members section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Members ({members.length})
            </h2>
            <div className="panel overflow-hidden">
              <UserTable
                users={members}
                currentUserId={currentUser?.id}
                onManage={openManage}
                onRemoveAdmin={removeAdmin}
                onDelete={deleteUser}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Admin Modal ── */}
      {managingUser && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setManagingUser(null)}
        >
          <div
            className="panel w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center text-lg font-bold">
                  {managingUser.display_name[0]}
                </div>
                <div>
                  <div className="font-bold">{managingUser.display_name}</div>
                  <div className="text-xs text-muted-foreground">@{managingUser.username} · {managingUser.email}</div>
                </div>
              </div>
              <button onClick={() => setManagingUser(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Admin Level */}
            <div>
              <div className="text-sm font-semibold mb-2">Admin Level</div>
              <div className="grid grid-cols-1 gap-2">
                {ADMIN_LEVELS.map(level => (
                  <button
                    key={level.value}
                    onClick={() => applyLevelDefaults(level.value)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      selectedLevel === level.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-[hsl(var(--surface-2))]"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 text-xs font-bold ${level.color}`}>
                      {level.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.description}</div>
                    </div>
                    {selectedLevel === level.value && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Permissions</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPerms(new Set(ALL_PERMISSIONS.map(p => p.value)))}
                    className="text-xs text-primary hover:underline"
                  >
                    All
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    onClick={() => setSelectedPerms(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {ALL_PERMISSIONS.map(perm => (
                  <label
                    key={perm.value}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[hsl(var(--surface-2))] cursor-pointer"
                  >
                    <div
                      className={`h-5 w-5 rounded border-2 grid place-items-center shrink-0 transition-colors ${
                        selectedPerms.has(perm.value)
                          ? "bg-primary border-primary"
                          : "border-border"
                      }`}
                      onClick={() => togglePerm(perm.value)}
                    >
                      {selectedPerms.has(perm.value) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{perm.label}</div>
                      <div className="text-xs text-muted-foreground">{perm.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 rounded-lg bg-[hsl(var(--surface-2))] text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{managingUser.display_name}</span> will be assigned as{" "}
              <span className="font-medium text-primary">
                {ADMIN_LEVELS.find(l => l.value === selectedLevel)?.label}
              </span>{" "}
              with <span className="font-medium text-foreground">{selectedPerms.size}</span> permissions.
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {managingUser.isAdmin && (
                <button
                  onClick={() => { removeAdmin(managingUser); setManagingUser(null); }}
                  className="h-10 px-4 rounded-lg border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
                >
                  Remove Admin
                </button>
              )}
              <button
                onClick={() => setManagingUser(null)}
                className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-[hsl(var(--surface-2))] ml-auto"
              >
                Cancel
              </button>
              <button
                onClick={saveAdminRole}
                disabled={saving}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {saving
                  ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <ShieldCheck className="h-4 w-4" />}
                {managingUser.isAdmin ? "Update Role" : "Make Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: User Table ──────────────────────────────────────────────

function UserTable({
  users,
  currentUserId,
  onManage,
  onRemoveAdmin,
  onDelete,
}: {
  users: UserRow[];
  currentUserId?: string;
  onManage: (u: UserRow) => void;
  onRemoveAdmin: (u: UserRow) => void;
  onDelete: (u: UserRow) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users found.</div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-[hsl(var(--surface-2))]">
          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">College</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Joined</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
          <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/50">
        {users.map((u) => {
          const levelInfo = ADMIN_LEVELS.find(l => l.value === u.adminLevel);
          const isCurrentUser = u.user_id === currentUserId;
          return (
            <tr key={u.user_id} className="hover:bg-[hsl(var(--surface-2))] transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold shrink-0">
                    {u.display_name[0]}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-1.5">
                      {u.display_name}
                      {isCurrentUser && (
                        <span className="text-[10px] text-muted-foreground">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">@{u.username} · {u.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="chip text-xs">{u.collegeName ?? "—"}</span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                {format(new Date(u.created_at), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-3">
                {u.isAdmin && levelInfo ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${levelInfo.color}`}>
                    {levelInfo.label}
                  </span>
                ) : u.isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/20 text-destructive">Admin</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(var(--surface-3))] text-muted-foreground">Member</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onManage(u)}
                    title="Manage admin role"
                    className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <UserCog className="h-4 w-4" />
                  </button>
                  {u.isAdmin && !isCurrentUser && (
                    <button
                      onClick={() => onRemoveAdmin(u)}
                      title="Remove admin"
                      className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                    >
                      <ShieldOff className="h-4 w-4" />
                    </button>
                  )}
                  {!isCurrentUser && (
                    <button
                      onClick={() => onDelete(u)}
                      title="Delete user"
                      className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
