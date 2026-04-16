import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  MessagesSquare,
  Users,
  ShoppingBag,
  CalendarDays,
  Gamepad2,
  GraduationCap,
  UserRound,
  LogOut,
  Sun,
  Moon,
  Bell,
  BookOpen,
  Trophy,
  Briefcase,
  Target,
  Languages,
} from "lucide-react";

type Profile = {
  display_name: string;
  username: string;
  avatar_url: string | null;
  college_id: string | null;
};

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/servers", label: "Servers", icon: MessagesSquare },
  { to: "/messages", label: "Messages", icon: Users },
  { to: "/network", label: "Network", icon: Users },
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/lms", label: "LMS", icon: BookOpen },
  { to: "/sports", label: "Sports", icon: Trophy },
  { to: "/opportunities", label: "Opportunities", icon: Briefcase },
  { to: "/placement", label: "Placement", icon: Target },
  { to: "/languages", label: "Languages", icon: Languages },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collegeName, setCollegeName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url, college_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data);
        if (data.college_id) {
          const { data: c } = await supabase
            .from("colleges")
            .select("short_code")
            .eq("id", data.college_id)
            .maybeSingle();
          setCollegeName(c?.short_code ?? null);
        }
      }
    })();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 hidden md:flex flex-col border-r border-border/50 bg-[hsl(var(--sidebar-background))] backdrop-blur-3xl shadow-2xl relative z-10 transition-all">
        <div className="h-14 flex items-center px-4 border-b border-border/50 bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm glow-primary shadow-lg shadow-primary/20">N</div>
            <div className="text-sm font-bold tracking-tight leading-none text-foreground glow-accent">NXT</div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-sm font-medium">
              {profile?.display_name?.[0] ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{profile?.display_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground truncate">
                @{profile?.username ?? "user"}
                {collegeName ? ` · ${collegeName}` : ""}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-3))] hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border/50 bg-background/50 backdrop-blur-lg sticky top-0 z-20">
          <div className="md:hidden flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm glow-primary shadow-lg shadow-primary/20">N</div>
            <span className="text-sm font-bold glow-accent">NXT</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={toggle}
              className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))]"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))]"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>

        <nav className="md:hidden grid grid-cols-5 border-t border-border bg-[hsl(var(--sidebar-background))]">
          {NAV.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 text-[11px] gap-1 ${
                  isActive ? "text-primary glow-accent" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
