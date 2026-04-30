import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Send, Users, Trash2 } from "lucide-react";
import { format } from "date-fns";

type NotifRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  display_name?: string;
};

export default function AdminNotifications() {
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    // Only server (channel) activity and admin broadcasts — never DMs or friend flows (private / not server chat).
    const { data: n } = await supabase
      .from("notifications")
      .select("*")
      .in("type", ["channel_message", "admin_broadcast"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (!n) { setLoading(false); return; }

    const userIds = [...new Set((n as NotifRow[]).map((x) => x.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const pmap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => (pmap[p.user_id] = p.display_name));

    setNotifs((n as NotifRow[]).map((x) => ({ ...x, display_name: pmap[x.user_id] })));
    setLoading(false);
  }

  async function broadcast() {
    if (!broadcastTitle.trim()) { toast.error("Title is required"); return; }
    setSending(true);

    const { data: profiles } = await supabase.from("profiles").select("user_id");
    if (!profiles?.length) { toast.error("No users found"); setSending(false); return; }

    const rows = profiles.map((p: any) => ({
      user_id: p.user_id,
      type: "admin_broadcast" as const,
      title: broadcastTitle.trim(),
      body: broadcastBody.trim() || null,
    }));

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      await supabase.from("notifications").insert(rows.slice(i, i + 50));
    }

    toast.success(`Broadcast sent to ${profiles.length} users`);
    setBroadcastTitle("");
    setBroadcastBody("");
    setSending(false);
    void load();
  }

  async function deleteNotif(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  async function clearAll() {
    if (!confirm("Delete all server & announcement notifications shown here? User DMs are not included.")) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("type", ["channel_message", "admin_broadcast"]);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotifs([]);
    toast.success("Server & announcement notifications cleared");
  }

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {notifs.length} total · {unread} unread · server &amp; announcements only (DMs hidden)
          </p>
        </div>
        {notifs.length > 0 && (
          <button onClick={clearAll} className="h-9 px-4 rounded-lg border border-destructive/50 text-destructive text-sm font-medium flex items-center gap-2 hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> Clear All
          </button>
        )}
      </div>

      {/* Broadcast panel */}
      <div className="panel p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Broadcast to All Users</h2>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Title *</div>
          <input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
            placeholder="Platform announcement…" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Message (optional)</div>
          <textarea value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring resize-none min-h-[60px]"
            placeholder="Additional details…" />
        </div>
        <button onClick={broadcast} disabled={sending || !broadcastTitle.trim()}
          className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
          {sending ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
          Send Broadcast
        </button>
      </div>

      {/* Notification log */}
      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-[hsl(var(--surface-2))] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Notifications
          </div>
          <div className="divide-y divide-border/50 max-h-[500px] overflow-auto">
            {notifs.map((n) => (
              <div key={n.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-[hsl(var(--surface-2))] transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                <div className="h-7 w-7 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold shrink-0 mt-0.5">
                  {(n.display_name ?? "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</div>}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    → {n.display_name} · {n.type} · {format(new Date(n.created_at), "MMM d, h:mm a")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  <button onClick={() => deleteNotif(n.id)}
                    className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {notifs.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
