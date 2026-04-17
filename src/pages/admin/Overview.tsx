import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, Server, Trophy, Code2, Bell, CalendarDays, TrendingUp } from "lucide-react";
import { format } from "date-fns";

type Stats = {
  users: number;
  messages: number;
  dms: number;
  servers: number;
  bookings: number;
  challenges: number;
  connections: number;
  notifications: number;
};

type RecentUser = {
  display_name: string;
  username: string;
  email: string;
  created_at: string;
};

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    users: 0, messages: 0, dms: 0, servers: 0,
    bookings: 0, challenges: 0, connections: 0, notifications: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [
      { count: users },
      { count: messages },
      { count: dms },
      { count: servers },
      { count: bookings },
      { count: challenges },
      { count: connections },
      { count: notifications },
      { data: recent },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("channel_messages").select("*", { count: "exact", head: true }),
      supabase.from("dm_messages").select("*", { count: "exact", head: true }),
      supabase.from("servers").select("*", { count: "exact", head: true }),
      supabase.from("sports_bookings").select("*", { count: "exact", head: true }),
      supabase.from("coding_challenges").select("*", { count: "exact", head: true }),
      supabase.from("connections").select("*", { count: "exact", head: true }),
      supabase.from("notifications").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("display_name, username, email, created_at")
        .order("created_at", { ascending: false }).limit(5),
    ]);

    setStats({
      users: users ?? 0, messages: messages ?? 0, dms: dms ?? 0,
      servers: servers ?? 0, bookings: bookings ?? 0, challenges: challenges ?? 0,
      connections: connections ?? 0, notifications: notifications ?? 0,
    });
    setRecentUsers((recent as RecentUser[]) ?? []);
    setLoading(false);
  }

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Channel Messages", value: stats.messages, icon: MessageSquare, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Direct Messages", value: stats.dms, icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Servers", value: stats.servers, icon: Server, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { label: "Sports Bookings", value: stats.bookings, icon: Trophy, color: "text-orange-400", bg: "bg-orange-400/10" },
    { label: "Challenges", value: stats.challenges, icon: Code2, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: "Connections", value: stats.connections, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Notifications Sent", value: stats.notifications, icon: Bell, color: "text-red-400", bg: "bg-red-400/10" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide stats at a glance.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading stats…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="panel p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${s.bg} ${s.color} grid place-items-center shrink-0`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xl font-bold">{s.value.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold mb-4">Recently Joined Users</h2>
            <div className="space-y-2">
              {recentUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold">
                      {u.display_name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{u.display_name}</div>
                      <div className="text-xs text-muted-foreground">@{u.username} · {u.email}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(u.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
