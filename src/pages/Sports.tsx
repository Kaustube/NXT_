import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  MapPin, Trophy, Clock, CalendarDays, CheckCircle2, Trash2,
  Dumbbell, Lock, Navigation, ExternalLink, Plus, Send, Globe,
  Building2, ChevronDown, ChevronUp,
} from "lucide-react";
import { SubmitContentDialog } from "@/components/SubmitContentDialog";

// ── Types ─────────────────────────────────────────────────────────────────────

type Venue = {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  emoji: string;
  location_text: string;
  maps_url: string | null;
  price_per_hour: string | null;
  college_id: string | null;
  booking_type: "open" | "slotted";
  is_approved: boolean | null;
};

type Slot = {
  slot_id: string;
  slot_time: string;
  max_bookings: number;
  booked_count: number;
};

type Booking = {
  id: string;
  court_name: string;
  slot_time: string;
  booking_date: string;
  status: string;
  venue_id: string | null;
  slot_id: string | null;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sports() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"courts" | "bookings" | "nearby">("courts");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Record<string, Slot[]>>({});
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState<string | null>(null); // slotId being booked
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);

  const hasCollege = !!profile?.college_id;
  const collegeName = profile?.college_name ?? null;

  const collegeVenues = venues.filter(v => v.college_id === profile?.college_id);
  const externalVenues = venues.filter(v => !v.college_id);

  useEffect(() => { if (user) { void loadVenues(); void loadBookings(); } }, [user, profile]);
  useEffect(() => { if (expandedVenue) void loadSlots(expandedVenue); }, [expandedVenue, selectedDate]);

  async function loadVenues() {
    setLoadingVenues(true);
    const { data } = await (supabase as any)
      .from("sports_venues")
      .select("*")
      .eq("is_approved", true)
      .eq("is_active", true)
      .order("college_id", { ascending: false })
      .order("name");
    setVenues((data ?? []) as Venue[]);
    setLoadingVenues(false);
  }

  async function loadBookings() {
    if (!user) return;
    const { data } = await supabase.from("sports_bookings")
      .select("*").eq("user_id", user.id)
      .order("booking_date", { ascending: false });
    setBookings((data as unknown as Booking[]) ?? []);
  }

  async function loadSlots(venueId: string) {
    const venue = venues.find(v => v.id === venueId);
    if (!venue || venue.booking_type !== "slotted") return;
    setLoadingSlots(true);
    const { data } = await (supabase as any).rpc("get_slot_booking_counts", {
      p_venue_id: venueId, p_date: selectedDate,
    });
    setSlots(prev => ({ ...prev, [venueId]: (data ?? []) as Slot[] }));
    setLoadingSlots(false);
  }

  async function bookSlot(venue: Venue, slot: Slot) {
    if (!user) return;
    if (slot.booked_count >= slot.max_bookings) {
      toast.error("This slot is full");
      return;
    }
    setBooking(slot.slot_id);
    const { error } = await supabase.from("sports_bookings").insert({
      user_id: user.id,
      court_name: venue.name,
      slot_time: slot.slot_time,
      booking_date: selectedDate,
      status: "confirmed",
      venue_id: venue.id,
      slot_id: slot.slot_id,
    } as any);
    setBooking(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`✅ Booked ${venue.name} at ${slot.slot_time} on ${format(new Date(selectedDate), "MMM d")}!`);
    void loadBookings();
    void loadSlots(venue.id);
  }

  async function bookOpen(venue: Venue) {
    if (!user) return;
    setBooking(venue.id);
    const { error } = await supabase.from("sports_bookings").insert({
      user_id: user.id,
      court_name: venue.name,
      slot_time: "Open",
      booking_date: selectedDate,
      status: "confirmed",
      venue_id: venue.id,
    } as any);
    setBooking(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`✅ Marked booking at ${venue.name} on ${format(new Date(selectedDate), "MMM d")}!`);
    void loadBookings();
  }

  async function cancelBooking(id: string) {
    await supabase.from("sports_bookings").delete().eq("id", id);
    toast.success("Booking cancelled");
    void loadBookings();
  }

  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { value: format(d, "yyyy-MM-dd"), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, MMM d") };
  });

  const todayBookings = bookings.filter(b => b.booking_date === format(new Date(), "yyyy-MM-dd"));

  return (
    <div className="flex-1 flex flex-col min-w-0 p-4 md:p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* Header */}
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-500 grid place-items-center">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Athletics & Sports</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {hasCollege ? `${collegeName} facilities + external venues` : "Find venues and sports facilities near you"}
              </p>
            </div>
          </div>
        </header>

        {/* Today's bookings banner */}
        {todayBookings.length > 0 && (
          <div className="panel p-4 border-l-4 border-l-orange-500 bg-orange-500/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-500">Today's Bookings</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {todayBookings.map(b => (
                <span key={b.id} className="chip text-xs">{b.court_name} · {b.slot_time}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border/50">
          {([
            { id: "courts", label: hasCollege ? "Campus Courts" : "All Venues" },
            { id: "bookings", label: `My Bookings (${bookings.length})` },
            { id: "nearby", label: "External Venues" },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? "border-orange-500 text-orange-500" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Courts / Venues tab ── */}
        {activeTab === "courts" && (
          <>
            {/* Date picker */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dateOptions.map(d => (
                <button key={d.value} onClick={() => setSelectedDate(d.value)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedDate === d.value ? "bg-orange-500 text-white border-orange-500" : "border-border text-muted-foreground hover:border-orange-500/50"}`}>
                  {d.label}
                </button>
              ))}
            </div>

            {loadingVenues ? (
              <div className="text-sm text-muted-foreground animate-pulse">Loading venues…</div>
            ) : (
              <>
                {/* College venues */}
                {hasCollege && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="h-4 w-4 text-primary" />
                      {collegeName} Facilities
                      <span className="text-xs text-muted-foreground font-normal">({collegeVenues.length} venues)</span>
                    </div>
                    {collegeVenues.length === 0 ? (
                      <div className="panel p-8 text-center text-sm text-muted-foreground">
                        No venues configured for your college yet.
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {collegeVenues.map(v => (
                          <VenueCard key={v.id} venue={v} slots={slots[v.id] ?? []}
                            loadingSlots={loadingSlots && expandedVenue === v.id}
                            expanded={expandedVenue === v.id}
                            onExpand={() => setExpandedVenue(expandedVenue === v.id ? null : v.id)}
                            onBookSlot={s => bookSlot(v, s)}
                            onBookOpen={() => bookOpen(v)}
                            bookingId={booking}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* All / non-college user sees all venues */}
                {!hasCollege && venues.length === 0 && (
                  <div className="panel p-12 text-center">
                    <Dumbbell className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">No approved venues yet.</p>
                  </div>
                )}
                {!hasCollege && venues.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {venues.map(v => (
                      <VenueCard key={v.id} venue={v} slots={slots[v.id] ?? []}
                        loadingSlots={loadingSlots && expandedVenue === v.id}
                        expanded={expandedVenue === v.id}
                        onExpand={() => setExpandedVenue(expandedVenue === v.id ? null : v.id)}
                        onBookSlot={s => bookSlot(v, s)}
                        onBookOpen={() => bookOpen(v)}
                        bookingId={booking}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* CTA — list your venue */}
            <div className="panel p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
              <div>
                <div className="text-xs uppercase tracking-wider text-primary font-semibold">Turf owners & colleges</div>
                <div className="text-sm font-semibold mt-1">Want to list a venue on NXT?</div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Submit a ticket. Admin reviews and sets booking type (open/slotted) and access level.
                </p>
              </div>
              <ListVenueDialog />
            </div>
          </>
        )}

        {/* ── My Bookings tab ── */}
        {activeTab === "bookings" && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="panel p-12 text-center">
                <Dumbbell className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No bookings yet.</p>
              </div>
            ) : bookings.map(b => (
              <div key={b.id} className="panel-2 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-500 grid place-items-center">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{b.court_name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.slot_time}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {format(new Date(b.booking_date), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${b.status === "confirmed" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{b.status}</span>
                  <button onClick={() => cancelBooking(b.id)} className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 grid place-items-center transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── External Venues tab ── */}
        {activeTab === "nearby" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 text-primary" />
              <span>External venues listed on NXT</span>
            </div>
            {externalVenues.length === 0 ? (
              <div className="panel p-10 text-center text-sm text-muted-foreground">No external venues listed yet.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {externalVenues.map(v => (
                  <VenueCard key={v.id} venue={v} slots={slots[v.id] ?? []}
                    loadingSlots={loadingSlots && expandedVenue === v.id}
                    expanded={expandedVenue === v.id}
                    onExpand={() => setExpandedVenue(expandedVenue === v.id ? null : v.id)}
                    onBookSlot={s => bookSlot(v, s)}
                    onBookOpen={() => bookOpen(v)}
                    bookingId={booking}
                  />
                ))}
              </div>
            )}
            <div className="panel p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
              <div>
                <div className="text-xs uppercase tracking-wider text-primary font-semibold">Venue owners</div>
                <div className="text-sm font-semibold mt-1">List your turf, court, or facility here</div>
                <p className="text-sm text-muted-foreground mt-0.5">Submit a request. Goes live after admin approval.</p>
              </div>
              <ListVenueDialog />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Venue Card ─────────────────────────────────────────────────────────────────

function VenueCard({
  venue, slots, loadingSlots, expanded, onExpand, onBookSlot, onBookOpen, bookingId,
}: {
  venue: Venue;
  slots: Slot[];
  loadingSlots: boolean;
  expanded: boolean;
  onExpand: () => void;
  onBookSlot: (s: Slot) => void;
  onBookOpen: () => void;
  bookingId: string | null;
}) {
  return (
    <div className={`panel overflow-hidden border ${venue.college_id ? "border-orange-500/20" : "border-border"}`}>
      <div className="p-5 cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors" onClick={onExpand}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl shrink-0">{venue.emoji}</div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{venue.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{venue.sport}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {venue.price_per_hour && (
              <span className="text-xs font-semibold text-primary">{venue.price_per_hour}</span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${venue.booking_type === "open" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {venue.booking_type}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Location row */}
        <div className="flex items-center gap-1.5 mt-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{venue.location_text}</span>
          {venue.maps_url && (
            <a href={venue.maps_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
              <Navigation className="h-3 w-3" /> Directions
            </a>
          )}
        </div>
      </div>

      {/* Expanded booking section */}
      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-border/50 space-y-3">
          {venue.description && (
            <p className="text-xs text-muted-foreground">{venue.description}</p>
          )}

          {venue.booking_type === "open" ? (
            <button
              onClick={onBookOpen}
              disabled={bookingId === venue.id}
              className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {bookingId === venue.id ? "Booking…" : "Book Now (Open)"}
            </button>
          ) : loadingSlots ? (
            <div className="text-xs text-muted-foreground animate-pulse">Loading slots…</div>
          ) : slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">No slots available. Admin hasn't added any yet.</p>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Slots</div>
              <div className="flex flex-wrap gap-2">
                {slots.map(s => {
                  const full = s.booked_count >= s.max_bookings;
                  return (
                    <button
                      key={s.slot_id}
                      onClick={() => !full && onBookSlot(s)}
                      disabled={full || bookingId === s.slot_id}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                        full
                          ? "bg-destructive/10 text-destructive border-destructive/20 cursor-not-allowed"
                          : bookingId === s.slot_id
                          ? "opacity-50"
                          : "border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                      }`}
                    >
                      {s.slot_time}
                      {full ? " · Full" : s.max_bookings > 1 ? ` (${s.max_bookings - s.booked_count} left)` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── List Venue Dialog ─────────────────────────────────────────────────────────

function ListVenueDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [locationText, setLocationText] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user || !name.trim() || !sport.trim() || !locationText.trim()) {
      toast.error("Name, sport, and location are required");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("sports_venues").insert({
        owner_id: user.id,
        name: name.trim(),
        sport: sport.trim().toLowerCase(),
        location_text: locationText.trim(),
        maps_url: mapsUrl.trim() || null,
        price_per_hour: pricePerHour.trim() || null,
        description: description.trim() || null,
        emoji: "🏟️",
        booking_type: "slotted",
        is_approved: false,
      });
      if (error) throw error;

      // notify admin
      try {
        await supabase.functions.invoke("notify-admin", {
          body: {
            record: {
              company_name: name,
              contact_email: user.email,
              phone_number: null,
              requested_services: ["sports_venue"],
              description: `[Venue listing] ${name} — ${sport} at ${locationText}`,
            },
          },
        });
      } catch { /* non-fatal */ }

      toast.success("Venue submitted! Admin will review and publish it.");
      setName(""); setSport(""); setLocationText(""); setMapsUrl(""); setPricePerHour(""); setDescription("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 shrink-0">
        <Plus className="h-4 w-4" /> List a Venue
      </button>
    );
  }

  return (
    <div className="w-full panel p-5 space-y-4 mt-2 border-primary/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Submit Venue Listing</span>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Venue name *"
          className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring" />
        <input value={sport} onChange={e => setSport(e.target.value)} placeholder="Sport (badminton, football…) *"
          className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring" />
        <input value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="Location / address *"
          className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring sm:col-span-2" />
        <input value={mapsUrl} onChange={e => setMapsUrl(e.target.value)} placeholder="Google Maps link (optional)"
          className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring" />
        <input value={pricePerHour} onChange={e => setPricePerHour(e.target.value)} placeholder="Price (e.g. ₹400/hr)"
          className="h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description, facilities, rules…"
          className="px-3 py-2 rounded-md bg-[hsl(var(--input))] border border-border text-sm resize-none min-h-[70px] outline-none focus:border-ring sm:col-span-2" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="h-9 px-4 rounded-md border border-border text-sm hover:bg-[hsl(var(--surface-2))]">Cancel</button>
        <button onClick={handleSubmit} disabled={submitting}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
          <Send className="h-4 w-4" />
          {submitting ? "Submitting…" : "Submit for Review"}
        </button>
      </div>
    </div>
  );
}
