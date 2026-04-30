import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ── Role types ────────────────────────────────────────────────────────────────

export type UserRole =
  | 'admin'
  | 'professor'
  | 'company'        // third-party company account
  | 'college_admin'  // college-scoped admin
  | 'server_admin'
  | 'server_mod'
  | 'member';

export type AdminLevel =
  | 'super_admin'
  | 'college_admin'
  | 'events_admin'
  | 'sports_admin'
  | 'marketplace_admin'
  | 'lms_admin'
  | 'services_admin'
  | 'notifications_admin'
  | 'finance_admin'
  | 'moderator';

// ── Profile type (loaded once, shared everywhere) ─────────────────────────────

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
  profile_visibility: "public" | "private";
  public_key: string | null;
  account_type: 'student' | 'professor' | 'company' | 'admin';
  company_name: string | null;
  company_approved: boolean;
};

// ── Context type ──────────────────────────────────────────────────────────────

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
  signUp: (
    email: string,
    password: string,
    meta: {
      display_name: string;
      username: string;
      roll_number?: string;
      college_id?: string;
      account_type?: 'student' | 'professor' | 'company';
      company_name?: string;
    },
  ) => Promise<{ error: string | null; session: Session | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Profile loader ────────────────────────────────────────────────────────────

async function loadProfile(uid: string): Promise<UserProfile | null> {
  try {
    const { data: p, error } = await (supabase
      .from("profiles") as any)
      .select("user_id, display_name, username, email, avatar_url, college_id, roll_number, bio, skills, interests, profile_visibility, public_key, account_type, company_name, company_approved")
      .eq("user_id", uid)
      .maybeSingle();

    if (error || !p) return null;

    let college_name: string | null = null;
    let college_short_code: string | null = null;
    if (p.college_id) {
      const { data: c } = await supabase
        .from("colleges")
        .select("name, short_code")
        .eq("id", p.college_id)
        .maybeSingle();
      college_name = c?.name ?? null;
      college_short_code = c?.short_code ?? null;
    }

    return {
      user_id: p.user_id,
      display_name: p.display_name ?? "",
      username: p.username ?? "",
      email: p.email ?? "",
      avatar_url: p.avatar_url ?? null,
      college_id: p.college_id ?? null,
      college_name,
      college_short_code,
      roll_number: p.roll_number ?? null,
      bio: p.bio ?? null,
      skills: p.skills ?? [],
      interests: p.interests ?? [],
      profile_visibility: p.profile_visibility ?? "public",
      public_key: p.public_key ?? null,
      account_type: p.account_type ?? 'student',
      company_name: p.company_name ?? null,
      company_approved: p.company_approved ?? false,
    };
  } catch {
    return null;
  }
}

// ── Role checker ──────────────────────────────────────────────────────────────

async function checkUserRoles(uid: string): Promise<{
  roles: UserRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isProfessor: boolean;
  isCompany: boolean;
  isCollegeAdmin: boolean;
  isFinanceAdmin: boolean;
  adminLevel: AdminLevel | null;
  emailVerified: boolean;
}> {
  try {
    const { data: rolesData } = await (supabase
      .from("user_roles") as any)
      .select("role, admin_level, scope_type")
      .eq("user_id", uid);

    const rows = (rolesData ?? []) as any[];
    const roles = rows.map((r: any) => r.role as UserRole);

    const adminRow = rows.find((r: any) => r.role === 'admin');
    const adminLevel = (adminRow?.admin_level as AdminLevel) ?? null;

    const { data: profileData } = await (supabase
      .from("profiles") as any)
      .select("email_verified")
      .eq("user_id", uid)
      .maybeSingle();

    return {
      roles,
      isAdmin: roles.includes('admin'),
      isSuperAdmin: adminLevel === 'super_admin',
      isProfessor: roles.includes('professor'),
      isCompany: roles.includes('company'),
      isCollegeAdmin: adminLevel === 'college_admin' || roles.includes('college_admin'),
      isFinanceAdmin: adminLevel === 'finance_admin',
      adminLevel,
      emailVerified: profileData?.email_verified || false,
    };
  } catch {
    return {
      roles: ['member'],
      isAdmin: false,
      isSuperAdmin: false,
      isProfessor: false,
      isCompany: false,
      isCollegeAdmin: false,
      isFinanceAdmin: false,
      adminLevel: null,
      emailVerified: false,
    };
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

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
    setRoles(r.roles);
    setIsAdmin(r.isAdmin);
    setIsSuperAdmin(r.isSuperAdmin);
    setIsProfessor(r.isProfessor);
    setIsCompany(r.isCompany);
    setIsCollegeAdmin(r.isCollegeAdmin);
    setIsFinanceAdmin(r.isFinanceAdmin);
    setAdminLevel(r.adminLevel);
    setEmailVerified(r.emailVerified);
  }

  const refreshRoles = async () => {
    if (!user) return;
    applyRoles(await checkUserRoles(user.id));
  };

  const refreshProfile = async () => {
    if (!user) return;
    setProfile(await loadProfile(user.id));
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT') {
        setSession(null); setUser(null); setProfile(null);
        setRoles(['member']); setIsAdmin(false); setIsSuperAdmin(false);
        setIsProfessor(false); setIsCompany(false); setIsCollegeAdmin(false);
        setIsFinanceAdmin(false); setAdminLevel(null); setEmailVerified(false);
        setLoading(false);
        return;
      }
      
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        const [roleData, profileData] = await Promise.all([
          checkUserRoles(s.user.id),
          loadProfile(s.user.id),
        ]);
        applyRoles(roleData);
        setProfile(profileData);
        setLoading(false);
        clearTimeout(timeout);
      } else {
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        const [roleData, profileData] = await Promise.all([
          checkUserRoles(s.user.id),
          loadProfile(s.user.id),
        ]);
        applyRoles(roleData);
        setProfile(profileData);
      }
      setLoading(false);
      clearTimeout(timeout);
    }).catch(() => {
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => { clearTimeout(timeout); sub.subscription.unsubscribe(); };
  }, []);

  const signIn: AuthContextType["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    
    // Refresh explicitly after sign in
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) {
      setUser(s.user);
      setSession(s);
      const [roleData, profileData] = await Promise.all([
        checkUserRoles(s.user.id),
        loadProfile(s.user.id),
      ]);
      applyRoles(roleData);
      setProfile(profileData);
    }
    return { error: null };
  };

  const signUp: AuthContextType["signUp"] = async (email, password, meta) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: meta,
      },
    });
    if (error) return { error: error.message, session: null };
    return { error: null, session: data.session ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false); setIsSuperAdmin(false); setIsProfessor(false);
    setIsCompany(false); setIsCollegeAdmin(false); setIsFinanceAdmin(false); setAdminLevel(null);
    setRoles(['member']); setEmailVerified(false);
    setUser(null); setSession(null); setProfile(null);
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      isAdmin, isSuperAdmin, isProfessor, isCompany, isCollegeAdmin, isFinanceAdmin,
      adminLevel, roles, emailVerified,
      signIn, signUp, signOut, refreshRoles, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
