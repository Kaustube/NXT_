import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Trophy, CalendarDays, Clock } from "lucide-react";
import { format } from "date-fns";

type Booking = {
  id: string;
  user_id: string;
  court_name: string;
  slot_time: string;
  booking_date: string;
  status: string;
  created_at: string;
  display_name?: string;
  username?: string;
};

export default function AdminSports() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data: bk } = await supabase
      .from("sports_bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .order("slot_time");

    if (!bk) { setLoading(false); return; }

    const userIds = [...new Set((bk as Booking[]).map((b) => b.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", userIds);

    const profileMap: Record<string, { display_name: string; username: string }> = {};
    (profiles ?? []).forEach((p: any) => (profileMap[p.user_id] = p));

    setBookings(
      (bk as Booking[]).map((b) => ({
        ...b,
        display_name: profileMap[b.user_id]?.display_name,
        username: profileMap[b.user_id]?.username,
      })),
    );
    setLoading(false);
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    const { error } = await supabase.from("sports_bookings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Booking cancelled"); void load(); }
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const filtered = bookings.filter((b) => {
    if (filter === "today") return b.booking_date === today;
    if (filter === "upcoming") return b.booking_date >= today;
    return true;
  });

  // Group by court
  const byCourt: Record<string, Booking[]> = {};
  filtered.forEach((b) => {
    if (!byCourt[b.court_name]) byCourt[b.court_name] = [];
    byCourt[b.court_name].push(b);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Sports Bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">{bookings.length} total bookings</p>
      </div>

      <div className="flex gap-2">
        {(["all", "today", "upcoming"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`h-8 px-4 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border hover:bg-[hsl(var(--surface-2))]"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-muted-foreground">No bookings found.</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byCourt).map(([court, items]) => (
            <div key={court} className="panel overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-[hsl(var(--surface-2))] flex items-center gap-2">
                <Trophy className="h-4 w-4 text-orange-400" />
                <span className="font-semibold text-sm">{court}</span>
                <span className="text-xs text-muted-foreground ml-auto">{items.length} booking{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-border/50">
                {items.map((b) => (
                  <div key={b.id} className="px-4 py-3 flex items-center justify-between hover:bg-[hsl(var(--surface-2))] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold">
                        {(b.display_name ?? "?")[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{b.display_name ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">@{b.username}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{b.slot_time}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(b.booking_date), "MMM d, yyyy")}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${b.status === "confirmed" ? "bg-emerald-400/10 text-emerald-400" : "bg-[hsl(var(--surface-3))] text-muted-foreground"}`}>
                        {b.status}
                      </span>
                      <button onClick={() => cancelBooking(b.id)}
                        className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
