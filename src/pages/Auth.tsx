import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowLeft, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";

type Mode = "login" | "register" | "forgot" | "reset";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Detect password reset token in URL hash (#access_token=...&type=recovery)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("reset");
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) toast.error(error);
    else navigate("/");
  }

  // ── Register ───────────────────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) {
      toast.error("Display name and username are required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    const { error } = await signUp(email.trim(), password, {
      display_name: displayName.trim(),
      username: username.trim().toLowerCase(),
      roll_number: rollNumber.trim() || undefined,
    });
    if (error) { toast.error(error); setBusy(false); return; }
    toast.success("Account created. Signing you in…");
    const { error: e2 } = await signIn(email.trim(), password);
    setBusy(false);
    if (e2) toast.error(e2);
    else navigate("/");
  }

  // ── Forgot password ────────────────────────────────────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your registered email"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setForgotSent(true);
  }

  // ── Reset password (after clicking email link) ─────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated! Signing you in…");
    // Clear the hash and redirect
    window.history.replaceState(null, "", window.location.pathname);
    navigate("/");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 border-r border-border bg-[hsl(var(--surface-1))]">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-semibold">N</div>
          <span className="text-sm tracking-wide">NXT</span>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="font-display text-5xl leading-tight text-foreground">
            One quiet home for college life.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Servers for your college and your interests. Tasks, marketplace, events,
            and direct messages — without the noise.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            {["Bennett", "IIT Delhi", "Delhi University"].map((c) => (
              <div key={c} className="panel p-3 text-xs text-muted-foreground">{c}</div>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground/50">© 2026 NXT Campus</div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-semibold">N</div>
            <span className="text-sm tracking-wide">NXT</span>
          </div>

          {/* ── RESET PASSWORD (from email link) ── */}
          {mode === "reset" && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary grid place-items-center">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Set new password</h2>
                  <p className="text-xs text-muted-foreground">Choose a strong password for your account.</p>
                </div>
              </div>
              <form onSubmit={handleReset} className="space-y-3">
                <Field label="New password">
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <button type="submit" disabled={busy}
                  className="w-full mt-2 h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60">
                  {busy ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === "forgot" && (
            <>
              <button onClick={() => { setMode("login"); setForgotSent(false); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </button>

              {forgotSent ? (
                <div className="text-center py-6">
                  <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary grid place-items-center mx-auto mb-4">
                    <Mail className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Check your email</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We sent a password reset link to<br />
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Didn't get it?{" "}
                    <button onClick={() => setForgotSent(false)} className="text-primary hover:underline">
                      Try again
                    </button>
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight">Forgot password?</h2>
                  <p className="text-sm text-muted-foreground mt-1 mb-6">
                    Enter your registered email and we'll send a reset link.
                  </p>
                  <form onSubmit={handleForgot} className="space-y-3">
                    <Field label="Registered email">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input"
                        placeholder="you@bennett.edu.in"
                        autoComplete="email"
                        required
                      />
                    </Field>
                    <button type="submit" disabled={busy}
                      className="w-full mt-2 h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60">
                      {busy ? "Sending…" : "Send reset link"}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">Sign in to NXT</h2>
              <p className="text-sm text-muted-foreground mt-1">Use your college email or any registered email.</p>

              <form onSubmit={handleLogin} className="mt-6 space-y-3">
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input" placeholder="you@bennett.edu.in" autoComplete="email" required />
                </Field>
                <Field label="Password">
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </Field>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={busy}
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60">
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <button onClick={() => setMode("register")}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground">
                New here? Create an account
              </button>
            </>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Use your college email so you auto-join your college server.
              </p>

              <form onSubmit={handleRegister} className="mt-6 space-y-3">
                <Field label="Full name">
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="input" placeholder="Kaustubh Singh" autoComplete="name" required />
                </Field>
                <Field label="Username">
                  <input value={username} onChange={(e) => setUsername(e.target.value)}
                    className="input" placeholder="kaustubh" autoComplete="username" required />
                </Field>
                <Field label="Roll number (optional)">
                  <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)}
                    className="input" placeholder="S24CSEU1380" />
                </Field>
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input" placeholder="you@bennett.edu.in" autoComplete="email" required />
                </Field>
                <Field label="Password">
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                  />
                </Field>
                <button type="submit" disabled={busy}
                  className="w-full mt-2 h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60">
                  {busy ? "Creating account…" : "Create account"}
                </button>
              </form>

              <button onClick={() => setMode("login")}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground">
                Already have an account? Sign in
              </button>
            </>
          )}

          {/* Admin link — shown on login/register only */}
          {(mode === "login" || mode === "register") && (
            <div className="mt-6 pt-4 border-t border-border">
              <a href="/admin"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <span className="h-5 w-5 rounded bg-destructive/20 text-destructive grid place-items-center">
                  <ShieldCheck className="h-3 w-3" />
                </span>
                Admin panel
              </a>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .input {
          width: 100%; height: 2.5rem; padding: 0 0.75rem;
          border-radius: 0.5rem; background: hsl(var(--input));
          border: 1px solid hsl(var(--border)); color: hsl(var(--foreground));
          font-size: 0.875rem; outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input:focus {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
        }
        .input::placeholder { color: hsl(var(--muted-foreground)); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function PasswordInput({
  value, onChange, show, onToggle, placeholder, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input pr-10"
        placeholder={placeholder ?? "••••••••"}
        autoComplete={autoComplete}
        required
        minLength={6}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
