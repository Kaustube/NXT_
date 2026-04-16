import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";


export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await signIn(email.trim(), password);
      if (error) toast.error(error);
      else navigate("/");
    } else {
      if (!displayName.trim() || !username.trim()) {
        toast.error("Display name and username are required");
        setBusy(false);
        return;
      }
      const { error } = await signUp(email.trim(), password, {
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        roll_number: rollNumber.trim() || undefined,
      });
      if (error) toast.error(error);
      else {
        toast.success("Account created. Signing you in…");
        const { error: e2 } = await signIn(email.trim(), password);
        if (e2) toast.error(e2);
        else navigate("/");
      }
    }
    setBusy(false);
  };


  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left: brand panel */}
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
              <div key={c} className="panel p-3 text-xs text-muted-foreground">
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-sm mx-auto">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-semibold">N</div>
            <span className="text-sm tracking-wide">NXT</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Sign in to NXT" : "Create your account"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Use your college email or any registered email."
              : "Use your college email so you auto-join your college server."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {mode === "register" && (
              <>
                <Field label="Full name">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input"
                    placeholder="Kaustubh Singh"
                    autoComplete="name"
                  />
                </Field>
                <Field label="Username">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input"
                    placeholder="kaustubh"
                    autoComplete="username"
                  />
                </Field>
                <Field label="Roll number (optional)">
                  <input
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="input"
                    placeholder="S24CSEU1380"
                  />
                </Field>
              </>
            )}
            <Field label="Email">
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
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
              />
            </Field>

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
          
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          height: 2.5rem;
          padding: 0 0.75rem;
          border-radius: 0.5rem;
          background: hsl(var(--input));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          font-size: 0.875rem;
          outline: none;
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
