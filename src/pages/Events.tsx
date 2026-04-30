import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { CalendarDays, MapPin, Clock, Pin, Star } from "lucide-react";
import BackButton from "@/components/BackButton";
import { RequestBoostDialog } from "@/components/monetization/RequestBoostDialog";
import { RequestListingAccessDialog } from "@/components/RequestListingAccessDialog";

type Event = {
  id: string;
  title: string;
  description: string;
  kind: "hackathon" | "codeathon" | "challenge";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  is_featured?: boolean;
  is_pinned?: boolean;
  ticket_price?: number;
};

const KIND_COLOR: Record<string, string> = {
  hackathon: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  codeathon: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  challenge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: ev, error }, { data: regs }] = await Promise.all([
      supabase.from("events").select("*").order("starts_at", { ascending: true }),
      supabase.from("event_registrations").select("event_id").eq("user_id", user.id),
    ]);
    if (error) toast.error("Failed to load events");
    setEvents((ev as Event[]) ?? []);
    setRegistered(new Set((regs ?? []).map((r: any) => r.event_id)));
    setLoading(false);
  }

  async function toggle(e: Event) {
    if (!user) return;
    if (registered.has(e.id)) {
      const { error } = await supabase.from("event_registrations")
        .delete().eq("event_id", e.id).eq("user_id", user.id);
      if (error) { toast.error(error.message); return; }
      const next = new Set(registered);
      next.delete(e.id);
      setRegistered(next);
      toast.success("Unregistered");
    } else {
      const { error } = await supabase.from("event_registrations")
        .insert({ event_id: e.id, user_id: user.id });
      if (error) { toast.error(error.message); return; }
      setRegistered(new Set([...registered, e.id]));
      toast.success(`Registered for ${e.title}!`);
    }
  }

  function isEventPast(e: Event): boolean {
    const end = e.ends_at ? new Date(e.ends_at) : new Date(e.starts_at);
    return isPast(end) && !isToday(new Date(e.starts_at));
  }

  const upcoming = events.filter(e => !isEventPast(e)).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return 0;
  });
  const past = events.filter(e => isEventPast(e));
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Events</div>
          <h1 className="font-display text-4xl mt-1">What's happening</h1>
        </div>
        <BackButton to="/dashboard" label="Dashboard" />
      </div>

      <div className="panel p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">For organizers</div>
          <div className="text-sm font-semibold mt-1">Need event listing access?</div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Event organizers can send an access request to the admin team first. Once approved, they can list events without a separate signup flow.
          </p>
        </div>
        <RequestListingAccessDialog
          services={[{ value: "events", label: "Events" }]}
          defaultService="events"
          title="Request event listing access"
          description="Share your organizer details and the kind of event you want to publish. The admin team will review this request before enabling event listing access."
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[hsl(var(--surface-2))] rounded-lg w-fit">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "upcoming" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Upcoming {upcoming.length > 0 && <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{upcoming.length}</span>}
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "past" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Past {past.length > 0 && <span className="ml-1 text-xs text-muted-foreground">{past.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="panel p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="panel p-12 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">
            {tab === "upcoming" ? "No upcoming events. Check back soon!" : "No past events yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((e) => {
            const past = isEventPast(e);
            const isReg = registered.has(e.id);
            return (
              <div
                key={e.id}
                className={`panel p-5 flex flex-col md:flex-row md:items-center md:gap-6 transition-opacity relative overflow-hidden ${past ? "opacity-60" : ""} ${e.is_featured && !past ? "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : ""}`}
              >
                {e.is_featured && !past && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                )}
                {/* Date block */}
                <div className="md:w-24 shrink-0 mb-3 md:mb-0 text-center md:text-left">
                  <div className="text-3xl font-bold leading-none">
                    {format(new Date(e.starts_at), "d")}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">
                    {format(new Date(e.starts_at), "MMM yyyy")}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 md:justify-start justify-center">
                    <Clock className="h-3 w-3" />
                    {format(new Date(e.starts_at), "h:mm a")}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${KIND_COLOR[e.kind] ?? "bg-muted text-muted-foreground"}`}>
                      {e.kind}
                    </span>
                    {isReg && !past && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ✓ Registered
                      </span>
                    )}
                    {past && (
                      <span className="text-xs text-muted-foreground">Ended</span>
                    )}
                    {e.is_pinned && !past && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                    {e.is_featured && !past && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                        <Star className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="text-base font-semibold flex items-center gap-2">
                    {e.title}
                    {e.ticket_price && e.ticket_price > 0 && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                        ₹{e.ticket_price}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.description}</div>
                  {e.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                      <MapPin className="h-3 w-3" />
                      {e.location}
                    </div>
                  )}
                </div>

                {/* Action */}
                {!past && (
                  <div className="md:ml-4 mt-3 md:mt-0 shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => toggle(e)}
                      className={`h-9 px-5 rounded-lg text-sm font-semibold transition-all ${
                        isReg
                          ? "border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {isReg ? "Unregister" : "Register"}
                    </button>
                    {/* Event Boost Button */}
                    <RequestBoostDialog moduleType="event" targetId={e.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
