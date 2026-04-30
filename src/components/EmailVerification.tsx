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

async function requestVerificationEmail(): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("send-verification-email", {
    method: "POST",
    body: {},
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const errJson = (await error.context.json()) as { error?: string };
        if (typeof errJson?.error === "string") {
          return { ok: false, error: errJson.error };
        }
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: error.message };
  }

  const errMsg = (data as { error?: string } | null)?.error;
  if (errMsg) return { ok: false, error: errMsg };
  return { ok: true, error: null };
}

export function EmailVerificationPage() {
  const { user, emailVerified, refreshRoles } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
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
      const { ok, error } = await requestVerificationEmail();
      setSending(false);
      if (!ok) {
        if (error) toast.error(error, { duration: isManual ? 10_000 : 12_000 });
        return;
      }
      toast.success("Verification code sent. Check your inbox (and spam).");
      setResendCooldown(60);
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
      const { data, error } = await supabase.rpc("verify_email_code", {
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
            We sent a <span className="font-medium text-foreground">6-digit code</span> to{" "}
            <span className="font-medium text-foreground">{user?.email}</span>. Enter it below to continue.
          </p>
        </div>

        <div className="space-y-5">
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
                  : "Resend code"}
            </Button>
            {resendCooldown === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Didn&apos;t get an email? Check spam, then configure{" "}
                <span className="font-mono text-[11px]">RESEND_API_KEY</span> on the{" "}
                <span className="font-mono text-[11px]">send-verification-email</span> Edge Function if needed.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
