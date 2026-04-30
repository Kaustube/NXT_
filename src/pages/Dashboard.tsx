import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { RequestListingAccessDialog } from "@/components/RequestListingAccessDialog";
import { WellnessTracker } from "@/components/WellnessTracker";
import {
  Plus, Check, Trash2, Flame, CalendarDays,
  Users, MessageSquare, Trophy, ArrowRight,
  Server, Gamepad2, BookOpen, ShoppingBag, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
};

type UpcomingEvent = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  location: string | null;
};

type Streak = { current_streak: number; longest_streak: number };

const QUICK_LINKS = [
  { to: "/servers",          label: "Servers",   icon: Server,    color: "text-blue-400 bg-blue-400/10" },
  { to: "/events",           label: "Events",    icon: CalendarDays, color: "text-purple-400 bg-purple-400/10" },
  { to: "/lms",              label: "LMS",       icon: BookOpen,  color: "text-green-400 bg-green-400/10" },
  { to: "/campus-services",  label: "Services",  icon: Building2, color: "text-yellow-400 bg-yellow-400/10" },
  { to: "/network",          label: "Network",   icon: Users,     color: "text-cyan-400 bg-cyan-400/10" },
  { to: "/marketplace",      label: "Market",    icon: ShoppingBag, color: "text-pink-400 bg-pink-400/10" },
];

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stats, setStats] = useState({ tasks: 0, messages: 0, events: 0, connections: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [month, setMonth] = useState(new Date());
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);

    const [
      { data: tk },
      msgResult,
      evResult,
      connResult,
      { data: streakData },
      { data: evUpcoming },
    ] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("channel_messages").select("*", { count: "exact", head: true }).eq("author_id", user.id),
      supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("connections").select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq("status", "accepted"),
      supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle(),
      supabase.from("events").select("id, title, kind, starts_at, location")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(3),
    ]);

    setTasks((tk as Task[]) ?? []);
    setStats({
      tasks: (tk ?? []).filter((t: Task) => !t.completed).length,
      messages: msgResult.count ?? 0,
      events: evResult.count ?? 0,
      connections: connResult.count ?? 0,
    });
    setStreak(streakData as Streak | null);
    setUpcomingEvents((evUpcoming as UpcomingEvent[]) ?? []);
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim() || !user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: newTask.trim(),
      due_date: newTaskDate || null,
    });
    if (error) { toast.error(error.message); return; }
    setNewTask("");
    setNewTaskDate("");
    setShowDatePicker(false);
    void loadAll();
  }

  async function toggleTask(t: Task) {
    await supabase.from("tasks").update({ completed: !t.completed }).eq("id", t.id);
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x));
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(x => x.id !== id));
    setStats(prev => ({ ...prev, tasks: Math.max(0, prev.tasks - 1) }));
  }

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const padStart = monthStart.getDay();
  const taskDates = new Set(tasks.filter(t => t.due_date).map(t => t.due_date as string));

  const openTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="text-3xl font-bold mt-0.5">
            {greet()}{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""} 👋
          </h1>
        </div>
        {streak && streak.current_streak > 0 && (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
          >
            <Flame className="h-5 w-5 text-orange-400" />
            <div className="text-left">
              <div className="text-sm font-bold text-orange-400">{streak.current_streak} day streak 🔥</div>
              <div className="text-xs text-muted-foreground">Best: {streak.longest_streak}</div>
            </div>
          </button>
        )}
      </div>

      {/* Wellness Tracker Component Integration */}
      <WellnessTracker />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Open tasks", value: stats.tasks, icon: Check, color: "text-primary bg-primary/10" },
          { label: "Messages sent", value: stats.messages, icon: MessageSquare, color: "text-blue-400 bg-blue-400/10" },
          { label: "Events joined", value: stats.events, icon: CalendarDays, color: "text-purple-400 bg-purple-400/10" },
          { label: "Connections", value: stats.connections, icon: Users, color: "text-emerald-400 bg-emerald-400/10" },
        ].map(s => (
          <div key={s.label} className="panel p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg ${s.color} grid place-items-center shrink-0`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-bold">{loading ? "—" : s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {QUICK_LINKS.map(q => (
          <Link
            key={q.to}
            to={q.to}
            className="panel p-3 flex flex-col items-center gap-2 hover:border-primary/40 transition-all hover:scale-105 group"
          >
            <div className={`h-9 w-9 rounded-xl ${q.color} grid place-items-center group-hover:scale-110 transition-transform`}>
              <q.icon className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{q.label}</span>
          </Link>
        ))}
      </div>

      <div className="panel p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">For companies and organizers</div>
          <h2 className="text-xl font-semibold">Need to post an event, job, or internship?</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Send one approval ticket to the admin team. After review, listing access can be enabled without any separate partner signup flow.
          </p>
        </div>
        <RequestListingAccessDialog
          services={[
            { value: "events", label: "Events" },
            { value: "jobs", label: "Jobs" },
            { value: "internships", label: "Internships" },
          ]}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Tasks — left 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Tasks</h2>
              <span className="text-xs text-muted-foreground">{openTasks.length} open</span>
            </div>

            {/* Add task form */}
            <form onSubmit={addTask} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Add a task…"
                  className="flex-1 h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowDatePicker(v => !v)}
                  className={`h-9 px-3 rounded-md border text-sm transition-colors ${
                    newTaskDate ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title="Set due date"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {showDatePicker && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newTaskDate}
                    min={format(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
                  />
                  {newTaskDate && (
                    <button
                      type="button"
                      onClick={() => setNewTaskDate("")}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </form>

            {/* Open tasks */}
            <ul className="space-y-1">
              {openTasks.length === 0 && (
                <li className="text-sm text-muted-foreground py-4 text-center">All done! Add a task above.</li>
              )}
              {openTasks.map((t) => (
                <li key={t.id} className="group flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[hsl(var(--surface-2))]">
                  <button
                    onClick={() => toggleTask(t)}
                    className="h-5 w-5 rounded-md border border-border grid place-items-center shrink-0 hover:border-primary transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{t.title}</div>
                    {t.due_date && (
                      <div className={`text-xs mt-0.5 ${
                        isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
                          ? "text-destructive"
                          : isToday(new Date(t.due_date))
                          ? "text-orange-400"
                          : "text-muted-foreground"
                      }`}>
                        {isToday(new Date(t.due_date)) ? "Due today" : `Due ${format(new Date(t.due_date), "MMM d")}`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Completed tasks (collapsed) */}
            {doneTasks.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                  {doneTasks.length} completed
                </summary>
                <ul className="mt-2 space-y-1">
                  {doneTasks.map((t) => (
                    <li key={t.id} className="group flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[hsl(var(--surface-2))]">
                      <button
                        onClick={() => toggleTask(t)}
                        className="h-5 w-5 rounded-md bg-primary border-primary border grid place-items-center shrink-0"
                      >
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      </button>
                      <span className="flex-1 text-sm line-through text-muted-foreground truncate">{t.title}</span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* Upcoming events widget */}
          {upcomingEvents.length > 0 && (
            <div className="panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Upcoming Events</h2>
                <Link to="/events" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[hsl(var(--surface-2))]">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 text-center">
                      <div className="text-sm font-bold leading-none">{format(new Date(e.starts_at), "d")}</div>
                      <div className="text-[9px] uppercase">{format(new Date(e.starts_at), "MMM")}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(e.starts_at), "h:mm a")}
                        {e.location && ` · ${e.location}`}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--surface-3))] text-muted-foreground capitalize">
                      {e.kind}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Calendar */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">{format(month, "MMMM yyyy")}</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMonth(subMonths(month, 1))}
                  className="h-7 w-7 grid place-items-center rounded-md hover:bg-[hsl(var(--surface-3))] text-muted-foreground text-lg"
                >‹</button>
                <button
                  onClick={() => setMonth(addMonths(month, 1))}
                  className="h-7 w-7 grid place-items-center rounded-md hover:bg-[hsl(var(--surface-3))] text-muted-foreground text-lg"
                >›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
              {days.map((d) => {
                const iso = format(d, "yyyy-MM-dd");
                const today = isSameDay(d, new Date());
                return (
                  <div
                    key={iso}
                    className={`aspect-square text-xs grid place-items-center rounded-md relative ${
                      today
                        ? "bg-primary text-primary-foreground font-bold"
                        : isSameMonth(d, month)
                        ? "text-foreground hover:bg-[hsl(var(--surface-2))]"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {format(d, "d")}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trophy / streak card */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <h2 className="text-sm font-semibold">Your Progress</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tasks completed</span>
                <span className="font-semibold">{doneTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Events joined</span>
                <span className="font-semibold">{stats.events}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-semibold">{stats.connections}</span>
              </div>
              {streak && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-xs text-muted-foreground">Daily streak</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full ${
                          i < Math.min(streak.current_streak, 7)
                            ? "bg-orange-400"
                            : "bg-[hsl(var(--surface-3))]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {streak.current_streak > 0
                      ? `${streak.current_streak} day streak 🔥`
                      : "Start your streak today!"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
