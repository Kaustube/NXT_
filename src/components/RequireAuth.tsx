import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

function LoadingScreen() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <div className="text-sm text-muted-foreground">Taking longer than expected…</div>
        <button
          onClick={() => window.location.reload()}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    </div>
  );
}

export function RequireAuth() {
  const { user, loading, emailVerified } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;

  // Redirect to verification page if not verified, except if we are already there
  if (!emailVerified && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4 p-6">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Your account doesn't have admin privileges. Contact a system administrator to request access.
        </p>
        <div className="flex gap-2 mt-4">
          <a href="/" className="h-10 px-6 rounded-md bg-primary text-primary-foreground font-medium text-sm flex items-center">
            Back to app
          </a>
        </div>
        <div className="mt-6 text-xs text-muted-foreground font-mono">
          User ID: {user.id}<br/>
          Email: {user.email}<br/>
          Admin: {isAdmin ? "true" : "false"}
        </div>
      </div>
    );
  }
  
  return <Outlet />;
}

export function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
