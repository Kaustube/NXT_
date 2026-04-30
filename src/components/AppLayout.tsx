import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, MessagesSquare, Users, ShoppingBag,
  CalendarDays, Gamepad2, BookOpen, LogOut, Sun, Moon,
  Trophy, Briefcase, Target, ShieldCheck, Server,
  HelpCircle, ChevronDown, ChevronRight, UserRound,
  Menu, X, Languages, Building2,
} from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";
import SettingsPanel from "@/components/SettingsPanel";
import AIChat from "@/components/AIChat";
import Logo from "@/components/Logo";

type Profile = {
  display_name: string;
  username: string;
  avatar_url: string | null;
  college_id: string | null;
};

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/servers",   label: "Servers",   icon: Server },
  { to: "/messages",  label: "Messages",  icon: MessagesSquare },
  { to: "/network",   label: "Network",   icon: Users },
  { to: "/events",    label: "Events",    icon: CalendarDays },
];

const SECONDARY_NAV = [
  { to: "/lms",              label: "LMS",             icon: BookOpen },
  { to: "/sports",           label: "Sports",           icon: Trophy },
  { to: "/campus-services",  label: "Campus Services",  icon: Building2 },
  { to: "/marketplace",      label: "Marketplace",      icon: ShoppingBag },
  { to: "/opportunities",    label: "Opportunities",    icon: Briefcase },
  { to: "/placement",        label: "Placement",        icon: Target },
  { to: "/games",            label: "Games",            icon: Gamepad2 },
  { to: "/languages",        label: "Languages",        icon: Languages },
  { to: "/help",             label: "Help",             icon: HelpCircle },
];

// Mobile bottom nav — 5 slots: 4 primary + "More" drawer trigger
const MOBILE_NAV = PRIMARY_NAV.slice(0, 4);

export default function AppLayout() {
  const { user, signOut, isAdmin, profile } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("nxt-ai-assistant-enabled") !== "false",
  );

  // Close mobile drawer on route change
  useEffect(() => { setMobileDrawerOpen(false); }, [location.pathname]);

  useEffect(() => {
    const sync = () =>
      setAiAssistantEnabled(localStorage.getItem("nxt-ai-assistant-enabled") !== "false");
    window.addEventListener("nxt-ai-assistant-pref-changed", sync);
    return () => window.removeEventListener("nxt-ai-assistant-pref-changed", sync);
  }, []);

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const Avatar = () => (
    <div className="h-7 w-7 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-bold shrink-0 overflow-hidden">
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        : initials}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside className="w-56 shrink-0 hidden md:flex flex-col border-r border-border/50 bg-[hsl(var(--sidebar-background))]">
        <div className="h-14 flex items-center px-4 border-b border-border/50">
          <Logo size="sm" showText />
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}

          <div className="pt-3">
            <button
              onClick={() => setExploreOpen(v => !v)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {exploreOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Explore
            </button>
            {exploreOpen && (
              <div className="mt-0.5 space-y-0.5">
                {SECONDARY_NAV.map((item) => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="p-2 border-t border-border/50 space-y-1">
          {isAdmin && (
            <NavLink to="/admin"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Panel
            </NavLink>
          )}
          <NavLink to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[hsl(var(--surface-2))] transition-colors ${isActive ? "bg-[hsl(var(--surface-2))]" : ""}`
            }>
            <Avatar />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate leading-tight">{profile?.display_name ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{profile?.college_short_code ?? `@${profile?.username ?? "user"}`}</div>
            </div>
            <UserRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </NavLink>
          <NavLink to="/help"
            className={({ isActive }) =>
              `w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors ${isActive ? "bg-[hsl(var(--surface-2))]" : ""}`
            }>
            <HelpCircle className="h-3.5 w-3.5" />
            Help & Tickets
          </NavLink>
          <button onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-20">
          {/* Mobile: logo + hamburger */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo size="sm" showText />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button onClick={toggle}
              className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-colors"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationPanel />
            <SettingsPanel />
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* ── AI Chat (floating; can be hidden in Settings) ── */}
        {aiAssistantEnabled && <AIChat />}

        {/* ── Mobile bottom nav ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-border/50 bg-[hsl(var(--sidebar-background))/0.9] backdrop-blur-xl mobile-nav safe-bottom">
          {MOBILE_NAV.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-3 gap-1 text-[10px] transition-all active:scale-90 ${isActive ? "text-primary" : "text-muted-foreground"}`
              }>
              <item.icon className={`h-5 w-5 transition-transform ${location.pathname === item.to ? "scale-110" : ""}`} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
          {/* "More" button opens full drawer */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-3 gap-1 text-[10px] text-muted-foreground active:scale-90 transition-all"
          >
            <Menu className="h-5 w-5" />
            <span className="font-medium">More</span>
          </button>
        </nav>
      </div>

      {/* ── Mobile full-screen drawer ── */}
      {mobileDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-border/50 animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-border/50">
              <Logo size="sm" showText />
              <button onClick={() => setMobileDrawerOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2">Main</p>
              {PRIMARY_NAV.map((item) => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}

              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mt-4 mb-2">Explore</p>
              {SECONDARY_NAV.map((item) => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}

              {isAdmin && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mt-4 mb-2">Admin</p>
                  <NavLink to="/admin"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Admin Panel
                  </NavLink>
                </>
              )}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-border/50 space-y-1">
              <NavLink to="/profile"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[hsl(var(--surface-2))] transition-colors ${isActive ? "bg-[hsl(var(--surface-2))]" : ""}`
                }>
                <Avatar />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{profile?.display_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{profile?.college_short_code ?? `@${profile?.username ?? "user"}`}</div>
                </div>
              </NavLink>
              <button onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
