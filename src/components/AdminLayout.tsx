import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Server,
  Trophy,
  BookOpen,
  Code2,
  LogOut,
  ShieldCheck,
  Bell,
  CalendarDays,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Handshake,
} from "lucide-react";

const ADMIN_NAV = [
  { to: "/admin",                label: "Overview",       icon: LayoutDashboard, end: true },
  { to: "/admin/users",          label: "Users",          icon: Users },
  { to: "/admin/staff",          label: "Staff Directory",icon: ShieldCheck },
  { to: "/admin/colleges",       label: "Colleges",       icon: GraduationCap },
  { to: "/admin/servers",        label: "Servers",        icon: Server },
  { to: "/admin/events",         label: "Events",         icon: CalendarDays },
  { to: "/admin/notifications",  label: "Notifications",  icon: Bell },
  { to: "/admin/challenges",     label: "Challenges",     icon: Code2 },
  { to: "/admin/sports",         label: "Sports",         icon: Trophy },
  { to: "/admin/lms",            label: "LMS",            icon: BookOpen },
  { to: "/admin/monetization",   label: "Monetization",   icon: IndianRupee },
  { to: "/admin/partners",       label: "Partner Apps",   icon: Handshake },
];

export default function AdminLayout() {
  const auth = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 hidden md:flex flex-col border-r border-border/50 bg-[hsl(var(--sidebar-background))]">
        {/* Header */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border/50">
          <div className="h-7 w-7 rounded-md bg-destructive text-destructive-foreground grid place-items-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold leading-none">NXT Admin</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Control Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5">
          {ADMIN_NAV.filter(item => 
            item.to !== "/admin/monetization" || (auth.isSuperAdmin || auth.isFinanceAdmin || auth.isAdmin)
          ).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item-active" : ""}`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <NavLink to="/dashboard" className="nav-item text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            Back to App
          </NavLink>
          <button
            onClick={() => auth.signOut()}
            className="nav-item w-full text-left text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center px-6 border-b border-border/50 bg-background/50 backdrop-blur-lg sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Admin Panel</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
