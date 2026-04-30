import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const { user, emailVerified } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || emailVerified || dismissed) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
      <div className="container max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <p className="text-sm">
            <span className="font-medium">Email not verified.</span>{" "}
            <Link to="/verify-email" className="underline hover:no-underline">
              Verify now
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

const SEND_CODE_TIMEOUT_MS = 8_000; // Reduced from 28s to 8s

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function parseFunctionsErrorBody(err: FunctionsHttpError): Promise<string | null> {
  try {
    const text = await withTimeout(
      err.context.text(),
      4000,
      "body-timeout",
    ).catch(() => null);
    if (!text) return null;
    try {
      const j = JSON.parse(text as string) as { error?: string };
      return typeof j?.error === "string" ? j.error : null;
    } catch {
      return (text as string).slice(0, 500);
    }
  } catch {
    return null;
  }
}

async function requestVerificationEmail(): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { ok: false, error: "Your session expired. Sign in again from the auth page." };
    }

    const invokePromise = supabase.functions.invoke("send-verification-email", {
      method: "POST",
      body: {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const { data, error } = await withTimeout(
      invokePromise,
      SEND_CODE_TIMEOUT_MS,
      "invoke-timeout",
    );
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const fromBody = await parseFunctionsErrorBody(error);
        if (fromBody) return { ok: false, error: fromBody };
      }
      return { ok: false, error: error.message };
    }

    const errMsg = (data as { error?: string } | null)?.error;
    if (errMsg) return { ok: false, error: errMsg };
    return { ok: true, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "invoke-timeout") {
      return {
        ok: false,
        error: "Email request timed out. Local Edge Functions might not be running.",
      };
    }
    if (msg === "body-timeout") {
      return { ok: false, error: "Could not read the full error from the server (slow response)." };
    }
    return {
      ok: false,
      error: msg || "Could not reach the verification service.",
    };
  }
}

export function EmailVerificationPage() {
  const { user, emailVerified, refreshRoles } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendAttempted, setSendAttempted] = useState(false);
  const [sendSucceeded, setSendSucceeded] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const autoSendTried = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (emailVerified) setVerified(true);
  }, [emailVerified]);

  const sendVerificationCode = useCallback(
    async (isManual: boolean) => {
      if (!user) return;
      setSending(true);
      setSendAttempted(true);
      setSendError(null);
      try {
        const { ok, error } = await requestVerificationEmail();
        if (!ok) {
          setSendSucceeded(false);
          setResendCooldown(0);
          setSendError(error ?? "Could not send the verification code.");
          if (error) toast.error(error, { duration: isManual ? 10_000 : 12_000 });
          return;
        }
        setSendSucceeded(true);
        setSendError(null);
        toast.success("Verification code sent. Check your inbox (and spam).");
        setResendCooldown(60);
      } finally {
        setSending(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user || emailVerified || autoSendTried.current) return;
    autoSendTried.current = true;
    void sendVerificationCode(false);
  }, [user, emailVerified, sendVerificationCode]);

  const verifyCode = async () => {
    if (!user) return;
    const codeStr = code.join("");
    if (codeStr.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("verify_email_code", {
        p_user_id: user.id,
        p_code: codeStr,
      });

      if (error) throw error;

      if (data === true) {
        toast.success("Email verified successfully!");
        setVerified(true);
        await refreshRoles();
      } else {
        toast.error("Invalid or expired code");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Email verified</h1>
          <p className="text-muted-foreground mb-6">
            You can use the full app now.
          </p>
          <Button asChild>
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
          <p className="text-muted-foreground text-sm">
            {sending
              ? <>We&apos;re sending a <span className="font-medium text-foreground">6-digit code</span> to <span className="font-medium text-foreground">{user?.email}</span>.</>
              : sendSucceeded
                ? <>We sent a <span className="font-medium text-foreground">6-digit code</span> to <span className="font-medium text-foreground">{user?.email}</span>. Enter it below to continue.</>
                : <>Send a <span className="font-medium text-foreground">6-digit code</span> to <span className="font-medium text-foreground">{user?.email}</span> to continue.</>}
          </p>
        </div>

        <div className="space-y-5">
          {sendError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-left">
              <div className="font-medium text-destructive">Couldn&apos;t send verification email</div>
              <div className="text-muted-foreground mt-1">{sendError}</div>
            </div>
          )}

          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-input border-2 border-border focus:border-primary focus:outline-none transition-colors"
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={() => void verifyCode()}
            disabled={loading || code.join("").length < 6}
            className="w-full"
          >
            {loading ? "Verifying…" : "Verify code"}
          </Button>

          <div className="flex flex-col gap-2 items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => void sendVerificationCode(true)}
              disabled={sending || resendCooldown > 0}
              className="w-full"
            >
              {sending
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : sendSucceeded || sendAttempted
                    ? "Resend code"
                    : "Send code"}
            </Button>
            
            {import.meta.env.DEV && (
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!user) return;
                  setLoading(true);
                  try {
                    await supabase.from("profiles").update({
                      email_verified: true,
                      email_verified_at: new Date().toISOString()
                    } as any).eq("user_id", user.id);
                    toast.success("Bypassed verification (Dev Mode)");
                    setVerified(true);
                    await refreshRoles();
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : String(e));
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full mt-2"
              >
                Bypass Verification (Dev Mode)
              </Button>
            )}


          </div>
        </div>
      </div>
    </div>
  );
}
