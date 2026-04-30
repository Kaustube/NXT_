import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'professor' | 'company' | 'college_admin' | 'server_admin' | 'server_mod' | 'member';
export type AdminLevel = 'super_admin' | 'college_admin' | 'events_admin' | 'sports_admin' | 'marketplace_admin' | 'lms_admin' | 'services_admin' | 'notifications_admin' | 'finance_admin' | 'moderator';

export type UserProfile = {
  user_id: string;
  display_name: string;
  username: string;
  email: string;
  avatar_url: string | null;
  college_id: string | null;
  college_name: string | null;
  college_short_code: string | null;
  roll_number: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  social_links: Array<{ platform: string; url: string; username: string }>;
  profile_visibility: "public" | "private";
  public_key: string | null;
  account_type: 'student' | 'professor' | 'company' | 'admin';
  company_name: string | null;
  company_approved: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isProfessor: boolean;
  isCompany: boolean;
  isCollegeAdmin: boolean;
  isFinanceAdmin: boolean;
  adminLevel: AdminLevel | null;
  roles: UserRole[];
  emailVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, meta: any) => Promise<{ error: string | null; session: Session | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileState: (data: Partial<UserProfile>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(uid: string, metadata?: any): Promise<UserProfile | null> {
  try {
    // Add cache buster query param via a fake filter or just relying on maybeSingle
    const { data: p, error } = await (supabase
      .from("profiles") as any)
      .select("user_id, display_name, username, email, avatar_url, college_id, roll_number, bio, skills, interests, social_links, profile_visibility, public_key, account_type, company_name, company_approved")
      .eq("user_id", uid)
      .maybeSingle();

    if (error || !p) {
      if (metadata) {
        return {
          user_id: uid, display_name: metadata.display_name || "", username: metadata.username || "user",
          email: "", avatar_url: null, college_id: metadata.college_id || null, college_name: null, college_short_code: null,
          roll_number: metadata.roll_number || null, bio: null, skills: [], interests: [], social_links: [], profile_visibility: "public",
          public_key: null, account_type: metadata.account_type || "student", company_name: metadata.company_name || null, company_approved: false,
        };
      }
      return null;
    }

    let college_name = null;
    let college_short_code = null;
    if (p.college_id) {
      const { data: c } = await supabase.from("colleges").select("name, short_code").eq("id", p.college_id).maybeSingle();
      college_name = c?.name ?? null;
      college_short_code = c?.short_code ?? null;
    }

    return {
      user_id: p.user_id, display_name: p.display_name ?? "", username: p.username ?? "", email: p.email ?? "",
      avatar_url: p.avatar_url ?? null, college_id: p.college_id ?? null, college_name, college_short_code,
      roll_number: p.roll_number ?? null, bio: p.bio ?? null, skills: p.skills ?? [], interests: p.interests ?? [],
      social_links: p.social_links ?? [],
      profile_visibility: p.profile_visibility ?? "public", public_key: p.public_key ?? null,
      account_type: p.account_type ?? 'student', company_name: p.company_name ?? null, company_approved: p.company_approved ?? false,
    };
  } catch { return null; }
}

async function checkUserRoles(uid: string) {
  try {
    const { data: rolesData } = await (supabase.from("user_roles") as any).select("role, admin_level").eq("user_id", uid);
    const rows = (rolesData ?? []) as any[];
    const roles = rows.map((r: any) => r.role as UserRole);
    const adminRow = rows.find((r: any) => r.role === 'admin');
    const adminLevel = (adminRow?.admin_level as AdminLevel) ?? null;
    const { data: profileData } = await (supabase.from("profiles") as any).select("email_verified").eq("user_id", uid).maybeSingle();
    return {
      roles, isAdmin: roles.includes('admin'), isSuperAdmin: adminLevel === 'super_admin', isProfessor: roles.includes('professor'),
      isCompany: roles.includes('company'), isCollegeAdmin: adminLevel === 'college_admin' || roles.includes('college_admin'),
      isFinanceAdmin: adminLevel === 'finance_admin', adminLevel, emailVerified: profileData?.email_verified || false,
    };
  } catch {
    return { roles: ['member'], isAdmin: false, isSuperAdmin: false, isProfessor: false, isCompany: false, isCollegeAdmin: false, isFinanceAdmin: false, adminLevel: null, emailVerified: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [isCollegeAdmin, setIsCollegeAdmin] = useState(false);
  const [isFinanceAdmin, setIsFinanceAdmin] = useState(false);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const [roles, setRoles] = useState<UserRole[]>(['member']);
  const [emailVerified, setEmailVerified] = useState(false);

  function applyRoles(r: Awaited<ReturnType<typeof checkUserRoles>>) {
    setRoles(r.roles); setIsAdmin(r.isAdmin); setIsSuperAdmin(r.isSuperAdmin); setIsProfessor(r.isProfessor);
    setIsCompany(r.isCompany); setIsCollegeAdmin(r.isCollegeAdmin); setIsFinanceAdmin(r.isFinanceAdmin);
    setAdminLevel(r.adminLevel); setEmailVerified(r.emailVerified);
  }

  const refreshProfile = async () => {
    if (!user) return;
    const p = await loadProfile(user.id, user.user_metadata);
    setProfile(p);
  };

  const updateProfileState = (data: Partial<UserProfile>) => {
    setProfile(prev => prev ? { ...prev, ...data } : null);
  };

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      const safetyTimeout = setTimeout(() => { if (mounted && loading) setLoading(false); }, 10000);
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.user && mounted) {
          setSession(s); setUser(s.user);
          const [roleData, profileData] = await Promise.all([checkUserRoles(s.user.id), loadProfile(s.user.id, s.user.user_metadata)]);
          if (mounted) { applyRoles(roleData); setProfile(profileData); }
        }
      } catch (err) { console.error(err); } finally { if (mounted) { setLoading(false); clearTimeout(safetyTimeout); } }
    }
    void initialize();
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setSession(null); setUser(null); setProfile(null); setRoles(['member']); setIsAdmin(false); setLoading(false); return;
      }
      if (s?.user) {
        setSession(s); setUser(s.user);
        const [roleData, profileData] = await Promise.all([checkUserRoles(s.user.id), loadProfile(s.user.id, s.user.user_metadata)]);
        if (mounted) { applyRoles(roleData); setProfile(profileData); setLoading(false); }
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) {
      setUser(s.user); setSession(s);
      const [roleData, profileData] = await Promise.all([checkUserRoles(s.user.id), loadProfile(s.user.id, s.user.user_metadata)]);
      applyRoles(roleData); setProfile(profileData);
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, meta: any) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: meta } });
    return { error: error?.message ?? null, session: data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, isAdmin, isSuperAdmin, isProfessor, isCompany, isCollegeAdmin, isFinanceAdmin,
      adminLevel, roles, emailVerified, signIn, signUp, signOut, refreshRoles: async () => {}, refreshProfile, updateProfileState,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
