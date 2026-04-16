import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

type Event = {
  id: string;
  title: string;
  description: string;
  kind: "hackathon" | "codeathon" | "challenge";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
};

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    if (!user) return;
    const [{ data: ev }, { data: regs }] = await Promise.all([
      supabase.from("events").select("*").order("starts_at", { ascending: true }),
      supabase.from("event_registrations").select("event_id").eq("user_id", user.id),
    ]);
    setEvents((ev as Event[]) ?? []);
    setRegistered(new Set((regs ?? []).map((r: any) => r.event_id)));
  }

  async function toggle(e: Event) {
    if (!user) return;
    if (registered.has(e.id)) {
      await supabase.from("event_registrations").delete().eq("event_id", e.id).eq("user_id", user.id);
      const next = new Set(registered);
      next.delete(e.id);
      setRegistered(next);
    } else {
      const { error } = await supabase.from("event_registrations").insert({ event_id: e.id, user_id: user.id });
      if (error) toast.error(error.message);
      else {
        setRegistered(new Set([...registered, e.id]));
        toast.success(`Registered for ${e.title}`);
      }
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Events</div>
        <h1 className="font-display text-4xl mt-1">What's happening</h1>
      </div>

      <div className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className="panel p-5 flex flex-col md:flex-row md:items-center md:gap-6">
            <div className="md:w-32 shrink-0 mb-3 md:mb-0">
              <div className="text-3xl font-display leading-none">{format(new Date(e.starts_at), "d")}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                {format(new Date(e.starts_at), "MMM yyyy")}
              </div>
              <div className="text-xs text-muted-foreground mt-2">{format(new Date(e.starts_at), "h:mm a")}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="chip">{e.kind}</span>
                {e.location && <span className="text-xs text-muted-foreground">{e.location}</span>}
              </div>
              <div className="text-base font-medium mt-1">{e.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{e.description}</div>
            </div>
            <div className="md:ml-4 mt-3 md:mt-0">
              <button
                onClick={() => toggle(e)}
                className={`h-9 px-4 rounded-md text-sm font-medium ${
                  registered.has(e.id)
                    ? "border border-border text-foreground"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {registered.has(e.id) ? "Registered" : "Register"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
