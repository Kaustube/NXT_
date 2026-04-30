import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AdminLevel } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, MessageSquare, ShieldCheck, Mail, Building2,
  CalendarDays, Trophy, Code2, Bell, Shield, Search
} from "lucide-react";

type StaffMember = {
  user_id: string;
  display_name: string;
  username: string;
  email: string;
  avatar_url: string | null;
  admin_level: AdminLevel;
  college_name?: string;
  college_short_code?: string;
};

const LEVEL_CONFIG: Record<AdminLevel, { label: string; icon: any; color: string }> = {
  super_admin:         { label: "Super Admin",   icon: ShieldCheck,  color: "text-red-400 bg-red-400/10 border-red-400/20" },
  college_admin:       { label: "College Admin", icon: Building2,    color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  events_admin:        { label: "Events Admin",  icon: CalendarDays, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  sports_admin:        { label: "Sports Admin",  icon: Trophy,       color: "text-green-400 bg-green-400/10 border-green-400/20" },
  marketplace_admin:   { label: "Market Admin",  icon: Users,        color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  lms_admin:           { label: "LMS Admin",     icon: Code2,        color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  services_admin:      { label: "Services Admin",icon: Building2,    color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  notifications_admin: { label: "Notify Admin",  icon: Bell,         color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  finance_admin:       { label: "Finance Admin", icon: Shield,       color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  moderator:           { label: "Moderator",     icon: Shield,       color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
};

export default function AdminStaff() {
  const { user, isSuperAdmin, adminLevel } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadStaff();
  }, [user, isSuperAdmin, adminLevel]);

  async function loadStaff() {
    setLoading(true);
    // Fetch user_roles where role = 'admin'
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id, admin_level")
      .eq("role", "admin");

    if (rolesErr || !roles) {
      setLoading(false);
      return;
    }

    // Extract UIDs
    const uids = roles.map(r => r.user_id);
    
    // Fetch profiles for these UIDs
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, email, avatar_url, college_id")
      .in("user_id", uids);

    if (profErr || !profiles) {
      setLoading(false);
      return;
    }

    // Fetch colleges if needed
    const collegeIds = profiles.map(p => p.college_id).filter(Boolean) as string[];
    const { data: colleges } = await supabase
      .from("colleges")
      .select("id, name, short_code")
      .in("id", collegeIds);

    const collegeMap = Object.fromEntries((colleges ?? []).map(c => [c.id, c]));

    // Map everything together
    const allStaff: StaffMember[] = profiles.map(p => {
      const role = roles.find(r => r.user_id === p.user_id);
      const college = p.college_id ? collegeMap[p.college_id] : null;
      return {
        ...p,
        admin_level: (role?.admin_level as AdminLevel) ?? "moderator",
        college_name: college?.name,
        college_short_code: college?.short_code,
      };
    });

    // Filtering logic:
    // Super Admins see everyone.
    // Others see themselves + others with SAME admin_level.
    const filteredStaff = allStaff.filter(s => {
      if (isSuperAdmin) return true;
      return s.admin_level === adminLevel;
    });

    setStaff(filteredStaff);
    setLoading(false);
  }

  async function contactAdmin(targetId: string) {
    if (!user) return;
    if (targetId === user.id) {
      toast.info("This is you!");
      return;
    }
    
    // Create or find DM room
    const { data: room, error } = await supabase.rpc("get_or_create_dm_room", {
      p_user1: user.id,
      p_user2: targetId
    });

    if (error) {
      toast.error("Could not open chat");
      return;
    }

    // Redirect to messages with this room
    navigate(`/messages?room=${room}`);
  }

  const filtered = staff.filter(s => 
    s.display_name.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Staff & Admin Directory
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSuperAdmin 
              ? "Super Admin view: All platform administrators." 
              : `Viewing all ${LEVEL_CONFIG[adminLevel ?? 'moderator'].label} colleagues.`}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="panel h-32 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-muted-foreground">No matching staff members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const config = LEVEL_CONFIG[s.admin_level];
            const LIcon = config.icon;
            const isMe = s.user_id === user?.id;

            return (
              <div key={s.user_id} className="panel p-4 flex flex-col justify-between hover:border-primary/30 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--surface-3))] grid place-items-center text-lg font-bold shrink-0 overflow-hidden border border-border/50 group-hover:scale-105 transition-transform">
                    {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-full w-full object-cover" /> : s.display_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate flex items-center gap-1.5">
                      {s.display_name}
                      {isMe && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">You</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">@{s.username}</div>
                    
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${config.color}`}>
                      <LIcon className="h-3 w-3" />
                      {config.label}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground flex flex-col">
                    <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {s.email}</span>
                    {s.college_short_code && <span className="flex items-center gap-1 mt-0.5"><Building2 className="h-2.5 w-2.5" /> {s.college_short_code}</span>}
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => contactAdmin(s.user_id)}
                      className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all active:scale-95"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Contact
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
