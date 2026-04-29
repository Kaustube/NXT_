import { NavLink, Outlet } from "react-router-dom";
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
  BookOpen,
  LogOut,
  Sun,
  Moon,
  Trophy,
  Briefcase,
  Target,
  ShieldCheck,
  Server,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  UserRound,
} from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";
import SettingsPanel from "@/components/SettingsPanel";

type Profile = {
  display_name: string;
  username: string;
  avatar_url: string | null;
  college_id: string | null;
};

// Primary nav — always visible in sidebar
const PRIMARY_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/servers", label: "Servers", icon: Server },
  { to: "/messages", label: "Messages", icon: MessagesSquare },
  { to: "/network", label: "Network", icon: Users },
  { to: "/events", label: "Events", icon: CalendarDays },
];

// Secondary nav — under collapsible "Explore" section
const SECONDARY_NAV = [
  { to: "/lms", label: "LMS", icon: BookOpen },
  { to: "/sports", label: "Sports", icon: Trophy },
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/opportunities", label: "Opportunities", icon: Briefcase },
  { to: "/placement", label: "Placement", icon: Target },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/help", label: "Help", icon: HelpCircle },
];

export default function AppLayout() {
  const { user, signOut, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);

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

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 hidden md:flex flex-col border-r border-border/50 bg-[hsl(var(--sidebar-background))]">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-sm shadow-md shadow-primary/30">
              N
            </div>
            <span className="text-sm font-bold tracking-tight">NXT Campus</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}

          {/* Explore collapsible */}
          <div className="pt-3">
            <button
              onClick={() => setExploreOpen(v => !v)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {exploreOpen
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />}
              Explore
            </button>
            {exploreOpen && (
              <div className="mt-0.5 space-y-0.5">
                {SECONDARY_NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border/50 space-y-1">
          {isAdmin && (
            <NavLink
              to="/admin"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Panel
            </NavLink>
          )}

          {/* Profile row */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[hsl(var(--surface-2))] transition-colors ${isActive ? "bg-[hsl(var(--surface-2))]" : ""}`
            }
          >
            <div className="h-7 w-7 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-bold shrink-0 overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                : initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate leading-tight">{profile?.display_name ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {collegeName ?? `@${profile?.username ?? "user"}`}
              </div>
            </div>
            <UserRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </NavLink>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-20">
          <div className="md:hidden flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-sm">N</div>
            <span className="text-sm font-bold">NXT</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={toggle}
              className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationPanel />
            <SettingsPanel />
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden grid grid-cols-5 border-t border-border/50 bg-[hsl(var(--sidebar-background))]">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 gap-1 text-[10px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
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
