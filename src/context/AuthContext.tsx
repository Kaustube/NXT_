import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = 'admin' | 'professor' | 'server_admin' | 'server_mod' | 'member';

type AuthContextType = {
  user: User | null;
  session: Session | null;
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
    meta: { display_name: string; username: string; roll_number?: string },
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

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
      if (!done) {
        done = true;
        setLoading(false);
      }
    }, 3000);

    // Auth state changes (sign in / sign out after initial load)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const roleData = await checkUserRoles(s.user.id);
        setRoles(roleData.roles);
        setIsAdmin(roleData.isAdmin);
        setIsProfessor(roleData.isProfessor);
        setIsServerAdmin(roleData.isServerAdmin);
        setEmailVerified(roleData.emailVerified);
      } else {
        setRoles(['member']);
        setIsAdmin(false);
        setIsProfessor(false);
        setIsServerAdmin(false);
        setEmailVerified(false);
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
      if (!done) {
        done = true;
        clearTimeout(timeout);
        setLoading(false);
      }
    }).catch(() => {
      // Supabase unreachable — still unblock the app
      if (!done) {
        done = true;
        clearTimeout(timeout);
        setLoading(false);
      }
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
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsProfessor(false);
    setIsServerAdmin(false);
    setRoles(['member']);
    setEmailVerified(false);
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
