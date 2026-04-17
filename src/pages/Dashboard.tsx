import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Plus, Check, Trash2, Flame, Trophy, CalendarDays, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { useNavigate } from "react-router-dom";

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
};

type Booking = {
  id: string;
  court_name: string;
  slot_time: string;
  booking_date: string;
  status: string;
};

type Streak = {
  current_streak: number;
  longest_streak: number;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [stats, setStats] = useState({ tasks: 0, messages: 0, events: 0, connections: 0 });
  const [activity, setActivity] = useState<Array<{ kind: string; text: string; at: string }>>([]);
  const [month, setMonth] = useState(new Date());
  const [profileName, setProfileName] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;
    const [
      { data: tk },
      { count: msgCount },
      { count: evCount },
      { count: connCount },
      { data: prof },
      { data: bk },
      { data: streakData },
    ] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("channel_messages").select("*", { count: "exact", head: true }).eq("author_id", user.id),
      supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("connections").select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq("status", "accepted"),
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("sports_bookings").select("*").eq("user_id", user.id)
        .gte("booking_date", format(new Date(), "yyyy-MM-dd"))
        .order("booking_date").order("slot_time").limit(5),
      supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle(),
    ]);

    setTasks((tk as Task[]) ?? []);
    setStats({
      tasks: (tk ?? []).filter((t: Task) => !t.completed).length,
      messages: msgCount ?? 0,
      events: evCount ?? 0,
      connections: connCount ?? 0,
    });
    setProfileName(prof?.display_name ?? "");
    setBookings((bk as Booking[]) ?? []);
    setStreak(streakData as Streak | null);

    const { data: regs } = await supabase
      .from("event_registrations")
      .select("registered_at, events(title)")
      .eq("user_id", user.id)
      .order("registered_at", { ascending: false })
      .limit(5);

    const items: Array<{ kind: string; text: string; at: string }> = [];
    (tk ?? []).slice(0, 5).forEach((t: Task) =>
      items.push({ kind: "Task", text: t.title, at: t.created_at }),
    );
    (regs ?? []).forEach((r: any) =>
      items.push({ kind: "Event", text: `Joined ${r.events?.title ?? "an event"}`, at: r.registered_at }),
    );
    items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    setActivity(items.slice(0, 8));
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim() || !user) return;
    const { error } = await supabase.from("tasks").insert({ user_id: user.id, title: newTask.trim() });
    if (error) toast.error(error.message);
    else {
      setNewTask("");
      void loadAll();
    }
  }

  async function toggleTask(t: Task) {
    await supabase.from("tasks").update({ completed: !t.completed }).eq("id", t.id);
    void loadAll();
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    void loadAll();
  }

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const padStart = monthStart.getDay();
  const taskDates = new Set(tasks.filter((t) => t.due_date).map((t) => t.due_date as string));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Dashboard</div>
          <h1 className="font-display text-4xl mt-1">
            {greet()}{profileName ? `, ${profileName.split(" ")[0]}` : ""}.
          </h1>
        </div>
        {streak && streak.current_streak > 0 && (
          <div
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 cursor-pointer hover:bg-orange-500/20 transition-colors"
          >
            <Flame className="h-5 w-5 text-orange-400" />
            <div>
              <div className="text-sm font-bold text-orange-400">{streak.current_streak} day streak</div>
              <div className="text-xs text-muted-foreground">Best: {streak.longest_streak}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Open tasks" value={stats.tasks} />
        <Stat label="Messages sent" value={stats.messages} />
        <Stat label="Events joined" value={stats.events} />
        <Stat label="Connections" value={stats.connections} />
      </div>

      {/* Sports bookings widget */}
      {bookings.length > 0 && (
        <div
          className="panel p-4 border-l-4 border-l-orange-500 cursor-pointer hover:border-orange-400 transition-colors"
          onClick={() => navigate("/sports")}
        >
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">Upcoming Sports Bookings</span>
            <span className="ml-auto text-xs text-orange-500 font-medium">View all →</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs">
                <Trophy className="h-3 w-3 text-orange-400" />
                <span className="font-medium">{b.court_name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{b.slot_time}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{format(new Date(b.booking_date), "MMM d")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Tasks</h2>
            <span className="text-xs text-muted-foreground">{tasks.filter((t) => !t.completed).length} open</span>
          </div>
          <form onSubmit={addTask} className="flex gap-2 mb-4">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Write a task and press Enter"
              className="flex-1 h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
            />
            <button
              type="submit"
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
          <ul className="space-y-1">
            {tasks.length === 0 && (
              <li className="text-sm text-muted-foreground py-6 text-center">No tasks yet.</li>
            )}
            {tasks.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[hsl(var(--surface-2))]"
              >
                <button
                  onClick={() => toggleTask(t)}
                  className={`h-5 w-5 rounded-md border ${t.completed ? "bg-primary border-primary" : "border-border"} grid place-items-center`}
                >
                  {t.completed && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                </button>
                <span className={`flex-1 text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                  {t.title}
                </span>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold tracking-tight">{format(month, "MMMM yyyy")}</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMonth(subMonths(month, 1))}
                  className="h-7 w-7 grid place-items-center rounded-md hover:bg-[hsl(var(--surface-3))] text-muted-foreground"
                >
                  ‹
                </button>
                <button
                  onClick={() => setMonth(addMonths(month, 1))}
                  className="h-7 w-7 grid place-items-center rounded-md hover:bg-[hsl(var(--surface-3))] text-muted-foreground"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: padStart }).map((_, i) => <div key={`p${i}`} />)}
              {days.map((d) => {
                const iso = format(d, "yyyy-MM-dd");
                const hasTask = taskDates.has(iso);
                const today = isSameDay(d, new Date());
                return (
                  <div
                    key={iso}
                    className={`aspect-square text-xs grid place-items-center rounded-md ${
                      today
                        ? "bg-primary text-primary-foreground"
                        : isSameMonth(d, month)
                        ? "text-foreground"
                        : "text-muted-foreground"
                    } ${hasTask && !today ? "ring-1 ring-primary/40" : ""}`}
                  >
                    {format(d, "d")}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold tracking-tight mb-3">Recent activity</h2>
            <ul className="space-y-2.5">
              {activity.length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing yet.</li>
              )}
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="chip mt-0.5">{a.kind}</span>
                  <div className="flex-1">
                    <div className="text-foreground">{a.text}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.at), "MMM d, h:mm a")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="stat-num mt-1">{value}</div>
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
