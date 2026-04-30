import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Trash2, Trophy, CalendarDays, Clock, MapPin, Plus, ShieldCheck,
  X, Check, Building2, Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

type Venue = {
  id: string;
  name: string;
  sport: string;
  emoji: string;
  location_text: string;
  maps_url: string | null;
  price_per_hour: string | null;
  college_id: string | null;
  booking_type: "open" | "slotted";
  is_approved: boolean | null;
  is_active: boolean;
  owner_id: string | null;
  description: string | null;
  college_name?: string;
};

type Slot = {
  id: string;
  venue_id: string;
  slot_time: string;
  max_bookings: number;
  is_active: boolean;
};

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

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminSports() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"venues" | "bookings">("venues");
  const [venueFilter, setVenueFilter] = useState<"pending" | "approved" | "all">("pending");

  // Venues
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Slots management
  const [slots, setSlots] = useState<Record<string, Slot[]>>({});
  const [newSlotTime, setNewSlotTime] = useState<Record<string, string>>({});
  const [newSlotMax, setNewSlotMax] = useState<Record<string, string>>({});
  const [addingSlot, setAddingSlot] = useState<string | null>(null);

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<"all" | "today" | "upcoming">("today");
  const [colleges, setColleges] = useState<Record<string, string>>({});

  useEffect(() => { void loadVenues(); void loadColleges(); }, [venueFilter]);
  useEffect(() => { if (tab === "bookings") void loadBookings(); }, [tab]);

  async function loadColleges() {
    const { data } = await supabase.from("colleges").select("id, name");
    const map: Record<string, string> = {};
    (data ?? []).forEach((c: any) => (map[c.id] = c.name));
    setColleges(map);
  }



  async function loadSlots(venueId: string) {
    const { data } = await (supabase as any)
      .from("sports_slots")
      .select("*")
      .eq("venue_id", venueId)
      .order("slot_time");
    setSlots(prev => ({ ...prev, [venueId]: (data ?? []) as Slot[] }));
  }

  async function approveVenue(id: string, approve: boolean) {
    setApprovingId(id);
    const { error } = await (supabase as any)
      .from("sports_venues")
      .update({ is_approved: approve })
      .eq("id", id);
    setApprovingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Venue approved and is now live!" : "Venue rejected");
    void loadVenues();
  }

  async function updateBookingType(id: string, type: "open" | "slotted") {
    await (supabase as any).from("sports_venues").update({ booking_type: type }).eq("id", id);
    setVenues(prev => prev.map(v => v.id === id ? { ...v, booking_type: type } : v));
    toast.success("Booking type updated");
  }

  async function addSlot(venueId: string) {
    const time = newSlotTime[venueId]?.trim();
    const max = parseInt(newSlotMax[venueId] ?? "1");
    if (!time) { toast.error("Enter a slot time"); return; }
    setAddingSlot(venueId);
    const { error } = await (supabase as any).from("sports_slots").insert({
      venue_id: venueId, slot_time: time, max_bookings: max || 1, created_by: user?.id,
    });
    setAddingSlot(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Slot added");
    setNewSlotTime(prev => ({ ...prev, [venueId]: "" }));
    setNewSlotMax(prev => ({ ...prev, [venueId]: "" }));
    void loadSlots(venueId);
  }

  async function deleteSlot(slotId: string, venueId: string) {
    if (!confirm("Delete this slot?")) return;
    await (supabase as any).from("sports_slots").delete().eq("id", slotId);
    toast.success("Slot removed");
    void loadSlots(venueId);
  }

  async function loadBookings() {
    setBookingsLoading(true);
    const { data: bk } = await supabase.from("sports_bookings").select("*")
      .order("booking_date", { ascending: false }).order("slot_time");
    if (!bk) { setBookingsLoading(false); return; }
    const userIds = [...new Set((bk as Booking[]).map(b => b.user_id))];
    const { data: profiles } = await (supabase as any).from("profiles")
      .select("user_id, display_name, username").in("user_id", userIds);
    const map: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => (map[p.user_id] = p));
    setBookings((bk as Booking[]).map(b => ({
      ...b,
      display_name: map[b.user_id]?.display_name,
      username: map[b.user_id]?.username,
    })));
    setBookingsLoading(false);
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel booking?")) return;
    const { error } = await supabase.from("sports_bookings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Cancelled"); void loadBookings(); }
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const filteredBookings = bookings.filter(b => {
    if (bookingFilter === "today") return b.booking_date === today;
    if (bookingFilter === "upcoming") return b.booking_date >= today;
    return true;
  });
  const byCourt: Record<string, Booking[]> = {};
  filteredBookings.forEach(b => { if (!byCourt[b.court_name]) byCourt[b.court_name] = []; byCourt[b.court_name].push(b); });

  const pendingCount = venues.filter(v => v.is_approved === null).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sports Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Venues, slots, and bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={seedDemoData}
            className="h-8 px-3 rounded-lg border border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 transition-all flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Seed Demo
          </button>
          {pendingCount > 0 && (
            <span className="h-8 px-3 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-sm font-bold flex items-center gap-1.5">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>
      {/* Top tabs */}
      <div className="flex gap-2 border-b border-border/50">
        {(["venues", "bookings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 px-2 text-sm font-bold border-b-2 capitalize transition-all ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── VENUES TAB ── */}
      {tab === "venues" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["pending", "approved", "all"] as const).map(f => (
              <button key={f} onClick={() => setVenueFilter(f)}
                className={`h-8 px-4 rounded-lg text-sm font-medium border capitalize transition-all ${venueFilter === f ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>

          {venuesLoading ? (
            <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
          ) : venues.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-muted-foreground">No {venueFilter} venues.</div>
          ) : (
            <div className="space-y-3">
              {venues.map(venue => {
                const isExpanded = expandedVenue === venue.id;
                return (
                  <div key={venue.id} className="panel overflow-hidden">
                    {/* Venue header row */}
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors"
                      onClick={() => {
                        setExpandedVenue(isExpanded ? null : venue.id);
                        if (!isExpanded) void loadSlots(venue.id);
                      }}
                    >
                      <div className="text-2xl">{venue.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{venue.name}</span>
                          <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-[hsl(var(--surface-3))] text-muted-foreground">{venue.sport}</span>

                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          {venue.college_id
                            ? <><Building2 className="h-3 w-3" /> {colleges[venue.college_id] ?? "College venue"}</>
                            : <><Globe className="h-3 w-3" /> External</>}
                          <span>·</span>
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{venue.location_text}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>

                    {/* Expanded management panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 border-t border-border/50 space-y-5">
                        {/* Approve / Reject */}
                        {venue.is_approved !== true && (
                          <div className="flex gap-2">
                            <button onClick={() => approveVenue(venue.id, false)} disabled={approvingId === venue.id}
                              className="h-9 px-4 rounded-lg border border-border text-sm flex items-center gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all disabled:opacity-50">
                              <X className="h-4 w-4" /> Reject
                            </button>
                            <button onClick={() => approveVenue(venue.id, true)} disabled={approvingId === venue.id}
                              className="h-9 px-4 rounded-lg bg-emerald-500 text-white text-sm font-bold flex items-center gap-1.5 hover:bg-emerald-600 transition-all disabled:opacity-50">
                              {approvingId === venue.id ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                              Approve & Publish
                            </button>
                          </div>
                        )}

                        {/* Booking type */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Type</div>
                          <div className="flex gap-2">
                            {(["open", "slotted"] as const).map(bt => (
                              <button key={bt} onClick={() => updateBookingType(venue.id, bt)}
                                className={`h-8 px-4 rounded-lg text-xs font-semibold border capitalize transition-all ${venue.booking_type === bt ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                                {bt === "open" ? "🔓 Open (no slots)" : "📅 Slotted"}
                              </button>
                            ))}
                          </div>
                          {venue.booking_type === "open" && (
                            <p className="text-xs text-muted-foreground">Users can book any time without a specific slot.</p>
                          )}
                        </div>

                        {/* Slot management — only for slotted */}
                        {venue.booking_type === "slotted" && (
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time Slots</div>
                            <div className="flex flex-wrap gap-2">
                              {(slots[venue.id] ?? []).map(s => (
                                <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[hsl(var(--surface-2))] border border-border text-xs">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{s.slot_time}</span>
                                  <span className="text-muted-foreground">max {s.max_bookings}</span>
                                  <button onClick={() => deleteSlot(s.id, venue.id)}
                                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              {(slots[venue.id] ?? []).length === 0 && (
                                <span className="text-xs text-muted-foreground">No slots yet. Add below.</span>
                              )}
                            </div>

                            {/* Add slot form */}
                            <div className="flex gap-2 items-end">
                              <div className="space-y-1 flex-1">
                                <div className="text-xs text-muted-foreground">Time (e.g. 5:00 PM)</div>
                                <input value={newSlotTime[venue.id] ?? ""} onChange={e => setNewSlotTime(prev => ({ ...prev, [venue.id]: e.target.value }))}
                                  placeholder="5:00 PM" className="h-8 w-full px-2.5 rounded-md bg-[hsl(var(--input))] border border-border text-xs outline-none focus:border-ring" />
                              </div>
                              <div className="space-y-1 w-24">
                                <div className="text-xs text-muted-foreground">Max bookings</div>
                                <input type="number" min="1" value={newSlotMax[venue.id] ?? "1"} onChange={e => setNewSlotMax(prev => ({ ...prev, [venue.id]: e.target.value }))}
                                  className="h-8 w-full px-2.5 rounded-md bg-[hsl(var(--input))] border border-border text-xs outline-none focus:border-ring" />
                              </div>
                              <button onClick={() => addSlot(venue.id)} disabled={addingSlot === venue.id}
                                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 hover:opacity-90 disabled:opacity-50 shrink-0">
                                {addingSlot === venue.id ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Plus className="h-3 w-3" />}
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── BOOKINGS TAB ── */}
      {tab === "bookings" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["today", "upcoming", "all"] as const).map(f => (
              <button key={f} onClick={() => setBookingFilter(f)}
                className={`h-8 px-4 rounded-lg text-sm font-medium border capitalize transition-all ${bookingFilter === f ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
          {bookingsLoading ? (
            <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
          ) : filteredBookings.length === 0 ? (
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
                    {items.map(b => (
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${b.status === "confirmed" ? "bg-emerald-400/10 text-emerald-400" : "bg-[hsl(var(--surface-3))] text-muted-foreground"}`}>{b.status}</span>
                          <button onClick={() => cancelBooking(b.id)} className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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
      )}
    </div>
  );
}
