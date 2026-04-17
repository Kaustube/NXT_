import { useEffect, useState } from "react";
import { MapPin, Users, Trophy, Clock, CalendarDays, CheckCircle2, Trash2, Dumbbell, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

type Booking = {
  id: string;
  court_name: string;
  slot_time: string;
  booking_date: string;
  status: string;
  created_at: string;
};

// College-specific courts
const COLLEGE_COURTS: Record<string, typeof COURTS_DEFAULT> = {};

const COURTS_DEFAULT = [
  { id: "Badminton", name: "Badminton Court", location: "Indoor Sports Complex", status: "Available", emoji: "🏸", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", slots: ["4:00 PM", "5:00 PM", "6:00 PM"] },
  { id: "Basketball", name: "Main Basketball Court", location: "Outdoor Complex A", status: "Busy", emoji: "🏀", color: "from-red-500/20 to-red-500/5", border: "border-red-500/30", slots: ["7:00 PM", "8:00 PM"] },
  { id: "Futsal", name: "Turf Futsal Ground", location: "Outdoor Complex B", status: "Available", emoji: "⚽", color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", slots: ["3:30 PM", "4:30 PM", "8:30 PM"] },
  { id: "Tennis", name: "Lawn Tennis Court", location: "Sports Center", status: "Available", emoji: "🎾", color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", slots: ["6:00 AM", "7:00 AM", "5:00 PM"] },
  { id: "Table Tennis", name: "Table Tennis Hall", location: "Indoor Sports Complex", status: "Available", emoji: "🏓", color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", slots: ["12:00 PM", "1:00 PM", "3:00 PM", "6:00 PM"] },
  { id: "Cricket", name: "Cricket Net Practice", location: "Main Ground", status: "Available", emoji: "🏏", color: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", slots: ["6:00 AM", "7:00 AM", "4:00 PM", "5:00 PM"] },
];

COLLEGE_COURTS["BU"] = [
  { id: "Badminton", name: "Badminton Court", location: "BU Indoor Sports Complex", status: "Available", emoji: "🏸", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", slots: ["4:00 PM", "5:00 PM", "6:00 PM"] },
  { id: "Basketball", name: "Basketball Court", location: "BU Outdoor Complex", status: "Available", emoji: "🏀", color: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", slots: ["6:00 PM", "7:00 PM", "8:00 PM"] },
  { id: "Futsal", name: "Turf Futsal Ground", location: "BU Sports Ground", status: "Available", emoji: "⚽", color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", slots: ["3:30 PM", "4:30 PM", "8:30 PM"] },
  { id: "Table Tennis", name: "Table Tennis Hall", location: "BU Recreation Center", status: "Available", emoji: "🏓", color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", slots: ["12:00 PM", "1:00 PM", "6:00 PM"] },
  { id: "Cricket", name: "Cricket Net Practice", location: "BU Main Ground", status: "Available", emoji: "🏏", color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", slots: ["6:00 AM", "7:00 AM", "4:00 PM"] },
];

COLLEGE_COURTS["IITD"] = [
  { id: "Badminton", name: "Badminton Courts (4)", location: "SAC Sports Complex", status: "Available", emoji: "🏸", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", slots: ["7:00 AM", "8:00 AM", "5:00 PM", "6:00 PM"] },
  { id: "Basketball", name: "Basketball Court", location: "SAC Outdoor", status: "Available", emoji: "🏀", color: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", slots: ["6:00 PM", "7:00 PM"] },
  { id: "Tennis", name: "Lawn Tennis Courts (3)", location: "SAC Tennis Complex", status: "Available", emoji: "🎾", color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", slots: ["6:00 AM", "7:00 AM", "4:00 PM", "5:00 PM"] },
  { id: "Squash", name: "Squash Courts", location: "SAC Indoor", status: "Available", emoji: "🏃", color: "from-red-500/20 to-red-500/5", border: "border-red-500/30", slots: ["7:00 AM", "12:00 PM", "5:00 PM"] },
  { id: "Swimming", name: "Swimming Pool", location: "SAC Aquatics", status: "Available", emoji: "🏊", color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", slots: ["6:00 AM", "7:00 AM", "4:00 PM"] },
];

COLLEGE_COURTS["DU"] = [
  { id: "Badminton", name: "Badminton Court", location: "DU Sports Complex", status: "Available", emoji: "🏸", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", slots: ["4:00 PM", "5:00 PM", "6:00 PM"] },
  { id: "Football", name: "Football Ground", location: "DU Main Ground", status: "Available", emoji: "⚽", color: "from-green-500/20 to-green-500/5", border: "border-green-500/30", slots: ["6:00 AM", "4:00 PM", "5:00 PM"] },
  { id: "Cricket", name: "Cricket Ground", location: "DU Sports Field", status: "Available", emoji: "🏏", color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", slots: ["6:00 AM", "7:00 AM", "3:00 PM"] },
  { id: "Table Tennis", name: "Table Tennis Hall", location: "DU Indoor Hall", status: "Available", emoji: "🏓", color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", slots: ["11:00 AM", "12:00 PM", "5:00 PM"] },
];

export default function Sports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"courts" | "bookings" | "events">("courts");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [collegeCode, setCollegeCode] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadBookings();
    void loadCollege();
  }, [user]);

  async function loadCollege() {
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("college_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if ((prof as any)?.college_id) {
      const { data: col } = await supabase
        .from("colleges")
        .select("short_code, name")
        .eq("id", (prof as any).college_id)
        .maybeSingle();
      setCollegeCode((col as any)?.short_code ?? null);
      setCollegeName((col as any)?.name ?? null);
    }
  }

  const COURTS = collegeCode
    ? (COLLEGE_COURTS[collegeCode] ?? COURTS_DEFAULT)
    : COURTS_DEFAULT;

  async function loadBookings() {
    if (!user) return;
    const { data } = await supabase
      .from("sports_bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setBookings((data as Booking[]) ?? []);
  }

  async function handleBooking(courtName: string, slot: string) {
    if (!user) return;
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("sports_bookings").insert({
      user_id: user.id,
      court_name: courtName,
      slot_time: slot,
      booking_date: today,
      status: "confirmed",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`✅ Booked ${courtName} at ${slot}!`);
      void loadBookings();
    }
  }

  async function cancelBooking(id: string) {
    await supabase.from("sports_bookings").delete().eq("id", id);
    toast.success("Booking cancelled");
    void loadBookings();
  }

  const todayBookings = bookings.filter(
    (b) => b.booking_date === format(new Date(), "yyyy-MM-dd"),
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-500 grid place-items-center">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Athletics & Sports</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-muted-foreground text-sm">Book courts, join intramurals, and stay active.</p>
                {collegeName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GraduationCap className="h-3 w-3" />
                    {collegeName} facilities
                  </span>
                )}
              </div>
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
                <span key={b.id} className="chip text-xs">
                  {b.court_name} · {b.slot_time}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 border-b border-border/50">
          {(["courts", "bookings", "events"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold border-b-2 transition-all capitalize ${
                activeTab === tab
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "bookings" ? `My Bookings (${bookings.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "courts" && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {COURTS.map((court) => (
              <div
                key={court.id}
                className={`panel p-5 bg-gradient-to-br ${court.color} border ${court.border} relative overflow-hidden group`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-2xl mb-1">{court.emoji}</div>
                    <h3 className="font-bold text-foreground">{court.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" /> {court.location}
                    </div>
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      court.status === "Available"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {court.status}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Available Slots
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {court.slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => handleBooking(court.name, slot)}
                        disabled={loading || court.status === "Busy"}
                        className="px-2.5 py-1 rounded-md bg-background/50 border border-border text-xs font-semibold hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="panel p-12 text-center">
                <Dumbbell className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No bookings yet. Book a court to get started!</p>
              </div>
            ) : (
              bookings.map((b) => (
                <div
                  key={b.id}
                  className="panel-2 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-500 grid place-items-center">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{b.court_name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {b.slot_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(b.booking_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                      {b.status}
                    </span>
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 grid place-items-center transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "events" && (
          <div className="space-y-4">
            {[
              {
                title: "Inter-hostel Basketball Final",
                time: "Tonight, 8:00 PM",
                teams: "Hostel A vs Hostel C",
                tags: ["Live", "Finals"],
                emoji: "🏀",
              },
              {
                title: "Open Table Tennis Tournament",
                time: "Saturday, 10:00 AM",
                teams: "Singles & Doubles",
                tags: ["Registration Open"],
                emoji: "🏓",
              },
              {
                title: "Futsal League — Week 3",
                time: "Sunday, 4:00 PM",
                teams: "8 teams competing",
                tags: ["Ongoing"],
                emoji: "⚽",
              },
              {
                title: "Badminton Open Championship",
                time: "Next Friday, 2:00 PM",
                teams: "Open to all",
                tags: ["Registration Open"],
                emoji: "🏸",
              },
            ].map((evt, j) => (
              <div
                key={j}
                className="panel-2 p-5 flex items-center justify-between border-l-4 border-l-orange-500"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{evt.emoji}</div>
                  <div>
                    <h4 className="font-bold text-base">{evt.title}</h4>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {evt.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {evt.teams}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {evt.tags.map((t) => (
                    <span
                      key={t}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t === "Live"
                          ? "bg-red-500/20 text-red-400 animate-pulse"
                          : t === "Finals"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                  <button className="text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
