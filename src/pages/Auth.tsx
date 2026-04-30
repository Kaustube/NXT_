import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowLeft, KeyRound, Eye, EyeOff, ShieldCheck, RefreshCw } from "lucide-react";
import CacheClearer from "@/components/CacheClearer";
import Logo from "@/components/Logo";

// forgot flow steps
type ForgotStep = "email" | "code" | "newpass" | "done";
type Mode = "login" | "register" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");

  // login / register fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [colleges, setColleges] = useState<Array<{ id: string; name: string; email_domain: string }>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // forgot-password flow
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);  // 8 digits — Supabase sends 8-digit codes
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Load colleges on mount
  useEffect(() => {
    async function loadColleges() {
      const { data } = await supabase.from("colleges").select("id, name, email_domain").order("name");
      if (data) setColleges(data);
    }
    void loadColleges();
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current!);
  }, [resendCooldown]);

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) toast.error(error);
    else navigate("/dashboard");
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
    
    // Verify email domain matches selected college (skip for "No College")
    if (selectedCollege && selectedCollege !== '00000000-0000-0000-0000-000000000000') {
      const college = colleges.find(c => c.id === selectedCollege);
      const emailDomain = email.split('@')[1];
      if (college && emailDomain !== college.email_domain) {
        toast.error(`Email must be from ${college.email_domain} domain for ${college.name}`);
        return;
      }
    }
    
    setBusy(true);
    const { error, session } = await signUp(email.trim(), password, {
      display_name: displayName.trim(),
      username: username.trim().toLowerCase(),
      roll_number: rollNumber.trim() || undefined,
      college_id: selectedCollege || undefined,
    });
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (!session) {
      toast.error(
        "No active session after sign-up. In Supabase Dashboard → Authentication → Providers → Email: turn off “Confirm email” so users get a session immediately and receive the 6-digit app code (configure Resend for the Edge Function). If Confirm email stays on, users must use the Supabase confirmation link instead.",
        { duration: 14_000 },
      );
      return;
    }
    toast.success("Account created. Enter the code we email you to finish setup.");
    navigate("/verify-email");
  }

  // ── Forgot: Step 1 — send OTP ──────────────────────────────────────────────
  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) { toast.error("Enter your registered email"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: forgotEmail.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: undefined, // force OTP code, not magic link
      },
    });
    setBusy(false);
    if (error) {
      toast.error("No account found with that email, or too many requests. Try again.");
      return;
    }
    toast.success("6-digit code sent to your email!");
    setForgotStep("code");
    setResendCooldown(60);
  }

  async function resendOtp() {
    if (resendCooldown > 0) return;
    setBusy(true);
    await supabase.auth.signInWithOtp({
      email: forgotEmail.trim(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    toast.success("New code sent!");
    setResendCooldown(60);
  }

  // ── Forgot: Step 2 — verify OTP ───────────────────────────────────────────
  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 8) { toast.error("Enter the full 8-digit code"); return; }
    setBusy(true);
    // Try OTP type first, fall back to magiclink
    let result = await supabase.auth.verifyOtp({
      email: forgotEmail.trim(),
      token: code,
      type: "email",
    });
    if (result.error) {
      result = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: code,
        type: "magiclink",
      });
    }
    setBusy(false);
    if (result.error) { toast.error("Invalid or expired code. Try again."); return; }
    setForgotStep("newpass");
  }

  // ── Forgot: Step 3 — set new password ─────────────────────────────────────
  async function setNewPass(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setForgotStep("done");
  }

  // OTP input helpers
  function handleOtpChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 7) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (text.length === 8) {
      setOtp(text.split(""));
      otpRefs.current[7]?.focus();
    }
  }

  function resetForgot() {
    setForgotStep("email");
    setForgotEmail("");
    setOtp(["", "", "", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
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
          <div className="pt-4 text-sm text-muted-foreground/70">
            Connect with students across colleges
          </div>
        </div>
        <div className="text-xs text-muted-foreground/50">© 2026 NXT Campus</div>
        <div className="mt-2">
          <CacheClearer />
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col justify-center px-6 py-10 lg:px-16 overflow-auto">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-semibold">N</div>
            <span className="text-sm tracking-wide">NXT</span>
          </div>

          {/* ════════════════════════════════════════
              FORGOT PASSWORD FLOW
          ════════════════════════════════════════ */}
          {mode === "forgot" && (
            <>
              {forgotStep !== "done" && (
                <button
                  onClick={() => { setMode("login"); resetForgot(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
              )}

              {/* Step 1: Enter email */}
              {forgotStep === "email" && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary grid place-items-center shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Reset password</h2>
                      <p className="text-xs text-muted-foreground">We'll send a 6-digit code to your email.</p>
                    </div>
                  </div>
                  <form onSubmit={sendOtp} className="space-y-3">
                    <Field label="Registered email">
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="input"
                        placeholder="your@college.edu"
                        autoComplete="email"
                        required
                      />
                    </Field>
                    <button type="submit" disabled={busy}
                      className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60">
                      {busy ? "Sending…" : "Send code"}
                    </button>
                  </form>
                </>
              )}

              {/* Step 2: Enter OTP */}
              {forgotStep === "code" && (
                <>
                  <div className="text-center mb-6">
                    <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary grid place-items-center mx-auto mb-3">
                      <Mail className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl font-semibold">Enter the code</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We sent an <span className="font-medium text-foreground">8-digit code</span> to {forgotEmail}
                    </p>
                  </div>

                  <form onSubmit={verifyOtp} className="space-y-5">
                    {/* OTP boxes — 8 digits */}
                    <div className="flex gap-1.5 justify-center" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-9 text-center text-lg font-bold rounded-lg bg-[hsl(var(--input))] border-2 border-border focus:border-primary focus:outline-none transition-colors"
                          style={{ height: "2.75rem" }}
                        />
                      ))}
                    </div>

                    <button type="submit" disabled={busy || otp.join("").length < 8}
                      className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60">
                      {busy ? "Verifying…" : "Verify code"}
                    </button>
                  </form>

                  <div className="mt-4 text-center">
                    {resendCooldown > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Resend in <span className="font-medium text-foreground">{resendCooldown}s</span>
                      </p>
                    ) : (
                      <button onClick={resendOtp} disabled={busy}
                        className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
                        <RefreshCw className="h-3 w-3" /> Resend code
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Step 3: Set new password */}
              {forgotStep === "newpass" && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary grid place-items-center shrink-0">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">New password</h2>
                      <p className="text-xs text-muted-foreground">Choose a strong password.</p>
                    </div>
                  </div>
                  <form onSubmit={setNewPass} className="space-y-3">
                    <Field label="New password">
                      <PasswordInput
                        value={newPassword}
                        onChange={setNewPassword}
                        show={showNew}
                        onToggle={() => setShowNew((v) => !v)}
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
                      className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60">
                      {busy ? "Saving…" : "Set new password"}
                    </button>
                  </form>
                </>
              )}

              {/* Step 4: Done */}
              {forgotStep === "done" && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className="text-xl font-semibold mb-2">Password updated!</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    You can now sign in with your new password.
                  </p>
                  <button
                    onClick={() => { setMode("login"); resetForgot(); }}
                    className="h-10 px-6 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════
              LOGIN
          ════════════════════════════════════════ */}
          {mode === "login" && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">Sign in to NXT</h2>
              <p className="text-sm text-muted-foreground mt-1">Use your college email or any registered email.</p>

              <form onSubmit={handleLogin} className="mt-6 space-y-3">
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input" placeholder="your@email.com" autoComplete="email" required />
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
                  <button type="button"
                    onClick={() => { setMode("forgot"); setForgotEmail(email); }}
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

              <div className="mt-6 pt-4 border-t border-border">
                <Link to="/admin"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <span className="h-5 w-5 rounded bg-destructive/20 text-destructive grid place-items-center">
                    <ShieldCheck className="h-3 w-3" />
                  </span>
                  Admin panel
                </Link>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════
              REGISTER
          ════════════════════════════════════════ */}
          {mode === "register" && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Use your college email so you auto-join your college server.
              </p>

              <form onSubmit={handleRegister} className="mt-6 space-y-3">
                {/* Trick browser autofill away from real fields */}
                <input type="text" style={{ display: "none" }} autoComplete="username" />
                <input type="password" style={{ display: "none" }} autoComplete="new-password" />
                <Field label="Full name">
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="input" placeholder="Your full name" autoComplete="off" required />
                </Field>
                <Field label="Username">
                  <input value={username} onChange={(e) => setUsername(e.target.value)}
                    className="input" placeholder="Choose a username" autoComplete="off" required />
                </Field>
                <Field label="College">
                  <select 
                    value={selectedCollege} 
                    onChange={(e) => setSelectedCollege(e.target.value)}
                    className="input"
                  >
                    <option value="">Select your college</option>
                    <option value="00000000-0000-0000-0000-000000000000">No College / Independent</option>
                    {colleges.filter(c => c.id !== '00000000-0000-0000-0000-000000000000').map((college) => (
                      <option key={college.id} value={college.id}>
                        {college.name} (@{college.email_domain})
                      </option>
                    ))}
                  </select>
                  {selectedCollege === '00000000-0000-0000-0000-000000000000' ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚠️ You won't have access to college servers, LMS, or sports booking
                    </p>
                  ) : selectedCollege ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      You'll auto-join your college server
                    </p>
                  ) : null}
                </Field>
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input" placeholder="your@college.edu" autoComplete="off" required />
                  {selectedCollege && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Use your {colleges.find(c => c.id === selectedCollege)?.email_domain} email
                    </p>
                  )}
                </Field>
                <Field label="Roll number (optional)">
                  <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)}
                    className="input" placeholder="e.g. 2021CS001" autoComplete="off" />
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

              <div className="mt-6 pt-4 border-t border-border">
                <Link to="/admin"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <span className="h-5 w-5 rounded bg-destructive/20 text-destructive grid place-items-center">
                    <ShieldCheck className="h-3 w-3" />
                  </span>
                  Admin panel
                </Link>
              </div>
            </>
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
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
