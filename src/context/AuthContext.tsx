import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = 'admin' | 'professor' | 'server_admin' | 'server_mod' | 'member';

// Profile is loaded once here and shared everywhere via context
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
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isProfessor: boolean;
  isServerAdmin: boolean;
  roles: UserRole[];
  emailVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    meta: { display_name: string; username: string; roll_number?: string; college_id?: string },
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(uid: string): Promise<UserProfile | null> {
  try {
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    if (!p) return null;

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
    };
  } catch {
    return null;
  }
}

async function checkUserRoles(uid: string): Promise<{
  roles: UserRole[];
  isAdmin: boolean;
  isProfessor: boolean;
  isServerAdmin: boolean;
  emailVerified: boolean;
}> {
  try {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .or("scope_type.is.null,scope_type.eq.global");
    const roles = (rolesData || []).map(r => r.role as UserRole);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email_verified")
      .eq("user_id", uid)
      .maybeSingle();
    return {
      roles,
      isAdmin: roles.includes('admin'),
      isProfessor: roles.includes('professor'),
      isServerAdmin: roles.includes('server_admin'),
      emailVerified: profileData?.email_verified || false,
    };
  } catch {
    return { roles: ['member'], isAdmin: false, isProfessor: false, isServerAdmin: false, emailVerified: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);
  const [isServerAdmin, setIsServerAdmin] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>(['member']);
  const [emailVerified, setEmailVerified] = useState(false);

  const applyRoles = (roleData: Awaited<ReturnType<typeof checkUserRoles>>) => {
    setRoles(roleData.roles);
    setIsAdmin(roleData.isAdmin);
    setIsProfessor(roleData.isProfessor);
    setIsServerAdmin(roleData.isServerAdmin);
    setEmailVerified(roleData.emailVerified);
  };

  const refreshRoles = async () => {
    if (!user) return;
    applyRoles(await checkUserRoles(user.id));
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await loadProfile(user.id);
    setProfile(p);
  };

  useEffect(() => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) { done = true; setLoading(false); }
    }, 3000);

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT') {
        setSession(null); setUser(null); setProfile(null);
        setRoles(['member']); setIsAdmin(false); setIsProfessor(false);
        setIsServerAdmin(false); setEmailVerified(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          const [roleData, profileData] = await Promise.all([
            checkUserRoles(s.user.id),
            loadProfile(s.user.id),
          ]);
          applyRoles(roleData);
          setProfile(profileData);
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const [roleData, profileData] = await Promise.all([
          checkUserRoles(s.user.id),
          loadProfile(s.user.id),
        ]);
        applyRoles(roleData);
        setProfile(profileData);
      }
      if (!done) { done = true; clearTimeout(timeout); setLoading(false); }
    }).catch(() => {
      if (!done) { done = true; clearTimeout(timeout); setLoading(false); }
    });

    return () => { clearTimeout(timeout); sub.subscription.unsubscribe(); };
  }, []);

  const signIn: AuthContextType["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) {
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
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: meta },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false); setIsProfessor(false); setIsServerAdmin(false);
    setRoles(['member']); setEmailVerified(false);
    setUser(null); setSession(null); setProfile(null);
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      isAdmin, isProfessor, isServerAdmin, roles, emailVerified,
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function checkUserRoles(uid: string): Promise<{
  roles: UserRole[];
  isAdmin: boolean;
  isProfessor: boolean;
  isServerAdmin: boolean;
  emailVerified: boolean;
}> {
  try {
    // Fetch all roles for user
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .or("scope_type.is.null,scope_type.eq.global");
    
    const roles = (rolesData || []).map(r => r.role as UserRole);
    
    // Check email verification status
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email_verified")
      .eq("user_id", uid)
      .maybeSingle();
    
    return {
      roles,
      isAdmin: roles.includes('admin'),
      isProfessor: roles.includes('professor'),
      isServerAdmin: roles.includes('server_admin'),
      emailVerified: profileData?.email_verified || false,
    };
  } catch {
    return {
      roles: ['member'],
      isAdmin: false,
      isProfessor: false,
      isServerAdmin: false,
      emailVerified: false,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);
  const [isServerAdmin, setIsServerAdmin] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>(['member']);
  const [emailVerified, setEmailVerified] = useState(false);

  const refreshRoles = async () => {
    if (!user) return;
    const roleData = await checkUserRoles(user.id);
    setRoles(roleData.roles);
    setIsAdmin(roleData.isAdmin);
    setIsProfessor(roleData.isProfessor);
    setIsServerAdmin(roleData.isServerAdmin);
    setEmailVerified(roleData.emailVerified);
  };

  useEffect(() => {
    let done = false;

    // Hard timeout — never stay loading more than 3 seconds
    const timeout = setTimeout(() => {
      if (!done) { done = true; setLoading(false); }
    }, 3000);

    // onAuthStateChange handles ALL session events including token refresh.
    // Supabase's autoRefreshToken:true already refreshes tokens automatically —
    // we must NOT call refreshSession() manually or it races and causes
    // "lock:sb-auth-token was released because another request stole it".
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setRoles(['member']);
        setIsAdmin(false);
        setIsProfessor(false);
        setIsServerAdmin(false);
        setEmailVerified(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          const roleData = await checkUserRoles(s.user.id);
          setRoles(roleData.roles);
          setIsAdmin(roleData.isAdmin);
          setIsProfessor(roleData.isProfessor);
          setIsServerAdmin(roleData.isServerAdmin);
          setEmailVerified(roleData.emailVerified);
        }
      }
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const roleData = await checkUserRoles(s.user.id);
        setRoles(roleData.roles);
        setIsAdmin(roleData.isAdmin);
        setIsProfessor(roleData.isProfessor);
        setIsServerAdmin(roleData.isServerAdmin);
        setEmailVerified(roleData.emailVerified);
      }
      if (!done) { done = true; clearTimeout(timeout); setLoading(false); }
    }).catch(() => {
      if (!done) { done = true; clearTimeout(timeout); setLoading(false); }
    });

    return () => {
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextType["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    
    // Refresh roles after sign in
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) {
      const roleData = await checkUserRoles(s.user.id);
      setRoles(roleData.roles);
      setIsAdmin(roleData.isAdmin);
      setIsProfessor(roleData.isProfessor);
      setIsServerAdmin(roleData.isServerAdmin);
      setEmailVerified(roleData.emailVerified);
    }
    
    return { error: null };
  };

  const signUp: AuthContextType["signUp"] = async (email, password, meta) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: meta,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    // Sign out from Supabase first (this invalidates the token server-side)
    await supabase.auth.signOut();
    
    // Clear auth state
    setIsAdmin(false);
    setIsProfessor(false);
    setIsServerAdmin(false);
    setRoles(['member']);
    setEmailVerified(false);
    setUser(null);
    setSession(null);
    
    // Navigate to auth — do NOT clear localStorage here.
    // Clearing localStorage removes the Supabase session token and causes
    // the "clear site data → re-login" loop. Supabase's signOut() already
    // removes its own keys from localStorage cleanly.
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isAdmin, 
      isProfessor, 
      isServerAdmin, 
      roles, 
      emailVerified,
      signIn, 
      signUp, 
      signOut,
      refreshRoles 
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
