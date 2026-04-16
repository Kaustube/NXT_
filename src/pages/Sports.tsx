import { useState } from "react";
import { CalendarDays, MapPin, Users, Trophy, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Sports() {
  const [activeTab, setActiveTab] = useState<"courts" | "events">("courts");

  const handleBooking = (court: string) => {
    toast.success(`Successfully booked ${court} for 1 hour!`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-500 grid place-items-center glow-accent">
              <Trophy className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Athletics & Sports</h1>
          </div>
          <p className="text-muted-foreground">Book courts, join intramurals, and stay active.</p>
        </header>

        <div className="flex gap-4 border-b border-border/50">
          <button
            onClick={() => setActiveTab("courts")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "courts" ? "border-orange-500 text-orange-500" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Court Booking
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "events" ? "border-orange-500 text-orange-500" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Intramurals & Events
          </button>
        </div>

        {activeTab === "courts" ? (
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { id: "Badminton", name: "Badminton Court", location: "Indoor Sports Complex", status: "Available", color: "bg-emerald-500", slots: ["4:00 PM", "5:00 PM", "6:00 PM"] },
              { id: "Basketball", name: "Main Basketball Court", location: "Outdoor Complex A", status: "Busy", color: "bg-red-500", slots: ["7:00 PM", "8:00 PM"] },
              { id: "Futsal", name: "Turf Futsal Ground", location: "Outdoor Complex B", status: "Available", color: "bg-blue-500", slots: ["3:30 PM", "4:30 PM", "8:30 PM"] },
              { id: "Tennis", name: "Lawn Tennis Court", location: "Sports Center", status: "Available", color: "bg-emerald-500", slots: ["6:00 AM", "7:00 AM", "5:00 PM"] }
            ].map(court => (
              <div key={court.id} className="panel p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm pointer-events-none transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110">
                  <Trophy className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{court.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" /> {court.location}
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      court.status === 'Available' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                    }`}>
                      {court.status}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">AVAILABLE SLOTS TODAY</p>
                    <div className="flex flex-wrap gap-2">
                       {court.slots.map(slot => (
                         <button 
                           key={slot}
                           onClick={() => handleBooking(court.name)}
                           className="px-3 py-1.5 rounded-md bg-surface-2 border border-border text-xs font-semibold hover:bg-primary/20 hover:text-primary transition-colors hover:border-primary/50"
                         >
                           {slot}
                         </button>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
             {[
               { title: "Inter-hostel Basketball Final", time: "Tonight, 8:00 PM", teams: "Hostel A vs Hostel C", tags: ["Live", "Finals"] },
               { title: "Open Table Tennis Tournament", time: "Saturday, 10:00 AM", teams: "Singles & Doubles", tags: ["Registration Open"] }
             ].map((evt, j) => (
                <div key={j} className="panel-2 p-5 flex items-center justify-between border-l-4 border-l-orange-500">
                  <div>
                    <h4 className="font-bold text-base">{evt.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {evt.time}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {evt.teams}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {evt.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-sm bg-surface-3 text-[10px] font-bold text-foreground">
                        {t}
                      </span>
                    ))}
                    <button className="mt-1 text-xs font-bold text-orange-500 hover:text-orange-400">View Details &rarr;</button>
                  </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
