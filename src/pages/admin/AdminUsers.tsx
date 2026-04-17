import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";

type UserRow = {
  user_id: string;
  display_name: string;
  username: string;
  email: string;
  college_id: string | null;
  roll_number: string | null;
  created_at: string;
  isAdmin: boolean;
  collegeName?: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: colleges }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
      supabase.from("colleges").select("id, short_code, name"),
    ]);

    const adminSet = new Set((roles ?? []).map((r: any) => r.user_id));
    const collegeMap: Record<string, string> = {};
    (colleges ?? []).forEach((c: any) => (collegeMap[c.id] = c.short_code));

    setUsers(
      (profiles ?? []).map((p: any) => ({
        ...p,
        isAdmin: adminSet.has(p.user_id),
        collegeName: p.college_id ? collegeMap[p.college_id] : undefined,
      })),
    );
    setLoading(false);
  }

  async function toggleAdmin(u: UserRow) {
    if (u.isAdmin) {
      await supabase.from("user_roles").delete()
        .eq("user_id", u.user_id).eq("role", "admin");
      toast.success(`Removed admin from ${u.display_name}`);
    } else {
      await supabase.from("user_roles").insert({ user_id: u.user_id, role: "admin" });
      toast.success(`Made ${u.display_name} an admin`);
    }
    void load();
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(`Delete ${u.display_name}? This cannot be undone.`)) return;
    // Delete profile — auth user cascade handled by DB
    const { error } = await supabase.from("profiles").delete().eq("user_id", u.user_id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Deleted ${u.display_name}`);
      void load();
    }
  }

  const filtered = users.filter(
    (u) =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} total users</p>
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
        <div className="panel overflow-hidden">
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
              {filtered.map((u) => (
                <tr key={u.user_id} className="hover:bg-[hsl(var(--surface-2))] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold shrink-0">
                        {u.display_name[0]}
                      </div>
                      <div>
                        <div className="font-medium">{u.display_name}</div>
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
                    {u.isAdmin ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/20 text-destructive uppercase">Admin</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(var(--surface-3))] text-muted-foreground uppercase">Member</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleAdmin(u)}
                        title={u.isAdmin ? "Remove admin" : "Make admin"}
                        className={`h-8 w-8 rounded-md grid place-items-center transition-colors ${
                          u.isAdmin
                            ? "text-destructive hover:bg-destructive/10"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                        }`}
                      >
                        {u.isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        title="Delete user"
                        className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
