import { useEffect, useState } from "react";
import { MapPin, Trophy, Clock, CalendarDays, CheckCircle2, Trash2, Dumbbell, GraduationCap, Lock, Navigation, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format, addDays } from "date-fns";

type Booking = {
  id: string;
  court_name: string;
  slot_time: string;
  booking_date: string;
  status: string;
  created_at: string;
};

// ── College-specific courts ───────────────────────────────────────────────────

const COLLEGE_COURTS: Record<string, CourtDef[]> = {
  BU: [
    { id: "Badminton", name: "Badminton Court", location: "BU Indoor Sports Complex, Greater Noida", mapsUrl: "https://maps.google.com/?q=Bennett+University+Sports+Complex", emoji: "🏸", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", slots: ["4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"] },
    { id: "Basketball", name: "Basketball Court", location: "BU Outdoor Complex, Greater Noida", mapsUrl: "https://maps.google.com/?q=Bennett+University+Basketball+Court", emoji: "🏀", color: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", slots: ["6:00 PM", "7:00 PM", "8:00 PM"] },
    { id: "Futsal", name: "Turf Futsal Ground", location: "BU Sports Ground, Greater Noida", mapsUrl: "https://maps.google.com/?q=Bennett+University+Futsal", emoji: "⚽", color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", slots: ["3:30 PM", "4:30 PM", "8:30 PM"] },
    { id: "Table Tennis", name: "Table Tennis Hall", location: "BU Recreation Center, Greater Noida", mapsUrl: "https://maps.google.com/?q=Bennett+University+Recreation+Center", emoji: "🏓", color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", slots: ["12:00 PM", "1:00 PM", "6:00 PM"] },
    { id: "Cricket", name: "Cricket Net Practice", location: "BU Main Ground, Greater Noida", mapsUrl: "https://maps.google.com/?q=Bennett+University+Cricket+Ground", emoji: "🏏", color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", slots: ["6:00 AM", "7:00 AM", "4:00 PM"] },
    { id: "Gym", name: "Fitness Center", location: "BU Sports Block, Greater Noida", mapsUrl: "https://maps.google.com/?q=Bennett+University+Gym", emoji: "🏋️", color: "from-red-500/20 to-red-500/5", border: "border-red-500/30", slots: ["6:00 AM", "7:00 AM", "5:00 PM", "6:00 PM", "7:00 PM"] },
  ],
};

// ── Nearby turfs for non-college users ───────────────────────────────────────

const NEARBY_TURFS = [
  { name: "Sportz Village Turf", sport: "Football / Futsal", location: "Sector 18, Noida", distance: "3.2 km", price: "₹800/hr", rating: "4.5 ⭐", mapsUrl: "https://maps.google.com/?q=Sportz+Village+Noida+Sector+18", emoji: "⚽" },
  { name: "PlayArena Sports Hub", sport: "Badminton / Cricket", location: "Sector 62, Noida", distance: "5.1 km", price: "₹400/hr", rating: "4.3 ⭐", mapsUrl: "https://maps.google.com/?q=PlayArena+Noida+Sector+62", emoji: "🏸" },
  { name: "Smash Zone Badminton", sport: "Badminton", location: "Knowledge Park, Greater Noida", distance: "2.8 km", price: "₹350/hr", rating: "4.6 ⭐", mapsUrl: "https://maps.google.com/?q=Smash+Zone+Greater+Noida", emoji: "🏸" },
  { name: "The Turf Arena", sport: "Football / Box Cricket", location: "Alpha 1, Greater Noida", distance: "4.5 km", price: "₹1200/hr", rating: "4.4 ⭐", mapsUrl: "https://maps.google.com/?q=The+Turf+Arena+Greater+Noida", emoji: "🏟️" },
  { name: "Ace Badminton Academy", sport: "Badminton", location: "Sector 50, Noida", distance: "6.2 km", price: "₹300/hr", rating: "4.7 ⭐", mapsUrl: "https://maps.google.com/?q=Ace+Badminton+Noida", emoji: "🏸" },
  { name: "GoSports Futsal", sport: "Futsal / Basketball", location: "Sector 137, Noida", distance: "3.8 km", price: "₹600/hr", rating: "4.2 ⭐", mapsUrl: "https://maps.google.com/?q=GoSports+Noida+Sector+137", emoji: "⚽" },
];

type CourtDef = {
  id: string;
  name: string;
  location: string;
  mapsUrl: string;
  emoji: string;
  color: string;
  border: string;
  slots: string[];
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sports() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"courts" | "bookings" | "nearby">("courts");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const hasCollege = !!profile?.college_id;
  const collegeCode = profile?.college_short_code ?? null;
  const collegeName = profile?.college_name ?? null;
  const COURTS = collegeCode ? (COLLEGE_COURTS[collegeCode] ?? []) : [];

  useEffect(() => {
    if (!user) return;
    void loadBookings();
  }, [user]);

  async function loadBookings() {
    if (!user) return;
    const { data } = await supabase
      .from("sports_bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false })
      .order("slot_time");
    setBookings((data as Booking[]) ?? []);
  }

  async function handleBooking(courtName: string, slot: string) {
    if (!user) return;
    if (!hasCollege) {
      toast.error("Sports booking is only available for college students");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("sports_bookings").insert({
      user_id: user.id,
      court_name: courtName,
      slot_time: slot,
      booking_date: selectedDate,
      status: "confirmed",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`✅ Booked ${courtName} at ${slot} on ${format(new Date(selectedDate), "MMM d")}!`);
      void loadBookings();
    }
  }

  async function cancelBooking(id: string) {
    await supabase.from("sports_bookings").delete().eq("id", id);
    toast.success("Booking cancelled");
    void loadBookings();
  }

  const todayBookings = bookings.filter(b => b.booking_date === format(new Date(), "yyyy-MM-dd"));

  // Generate next 7 days for date picker
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { value: format(d, "yyyy-MM-dd"), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, MMM d") };
  });

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
                {hasCollege
                  ? `${collegeName} facilities · Book courts and stay active`
                  : "Find nearby turfs and sports facilities"}
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
              {todayBookings.map((b) => (
                <span key={b.id} className="chip text-xs">{b.court_name} · {b.slot_time}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border/50">
          {([
            { id: "courts", label: hasCollege ? "Book Courts" : "Campus Courts" },
            { id: "bookings", label: `My Bookings (${bookings.length})` },
            { id: "nearby", label: "Nearby Turfs" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Courts tab ── */}
        {activeTab === "courts" && (
          <>
            {!hasCollege ? (
              <div className="panel p-12 text-center">
                <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <h2 className="font-semibold text-lg mb-2">College required</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Campus sports booking is only available to students linked to a college.
                  Check the <strong>Nearby Turfs</strong> tab for public facilities near you.
                </p>
                <button
                  onClick={() => setActiveTab("nearby")}
                  className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                >
                  Find Nearby Turfs →
                </button>
              </div>
            ) : COURTS.length === 0 ? (
              <div className="panel p-12 text-center">
                <Dumbbell className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No courts configured for your college yet.</p>
              </div>
            ) : (
              <>
                {/* Date picker */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dateOptions.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedDate(d.value)}
                      className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        selectedDate === d.value
                          ? "bg-orange-500 text-white border-orange-500"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-orange-500/50"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {COURTS.map((court) => (
                    <div key={court.id} className={`panel p-5 bg-gradient-to-br ${court.color} border ${court.border} relative overflow-hidden`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-2xl mb-1">{court.emoji}</div>
                          <h3 className="font-bold text-foreground">{court.name}</h3>
                          <a
                            href={court.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 hover:text-primary transition-colors"
                          >
                            <MapPin className="h-3 w-3" />
                            {court.location}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                          Available
                        </span>
                      </div>
                      <div className="mt-4">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Slots · {format(new Date(selectedDate), "MMM d")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {court.slots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => handleBooking(court.name, slot)}
                              disabled={loading}
                              className="px-2.5 py-1 rounded-md bg-background/50 border border-border text-xs font-semibold hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-40"
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── My Bookings tab ── */}
        {activeTab === "bookings" && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="panel p-12 text-center">
                <Dumbbell className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No bookings yet. Book a court to get started!</p>
              </div>
            ) : (
              bookings.map((b) => (
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">{b.status}</span>
                    <button onClick={() => cancelBooking(b.id)} className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 grid place-items-center transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Nearby Turfs tab ── */}
        {activeTab === "nearby" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="h-4 w-4 text-primary" />
              <span>Showing turfs near Greater Noida / Noida area</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {NEARBY_TURFS.map((turf, i) => (
                <div key={i} className="panel p-4 hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{turf.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{turf.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{turf.sport}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {turf.location} · {turf.distance}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-semibold text-primary">{turf.price}</span>
                        <span className="text-xs text-muted-foreground">{turf.rating}</span>
                      </div>
                    </div>
                    <a
                      href={turf.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-3 rounded-lg border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-[hsl(var(--surface-2))] hover:border-primary/50 transition-colors shrink-0"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
