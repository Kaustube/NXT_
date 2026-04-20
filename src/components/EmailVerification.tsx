import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const { user, emailVerified, refreshRoles } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || emailVerified || dismissed) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
      <div className="container max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <p className="text-sm">
            <span className="font-medium">Email not verified.</span>{" "}
            <a href="/verify-email" className="underline hover:no-underline">
              Verify now
            </a>
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function EmailVerificationPage() {
  const { user, emailVerified, refreshRoles } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (emailVerified) {
      setVerified(true);
    }
  }, [emailVerified]);

  const sendVerificationCode = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_verification_code", {
        p_user_id: user.id,
        p_email: user.email,
      });
      
      if (error) throw error;
      
      toast.success("Verification code sent to your email!");
      setResendCooldown(60);
    } catch (error: any) {
      toast.error(error.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

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
      
      if (data) {
        toast.success("Email verified successfully!");
        setVerified(true);
        await refreshRoles();
      } else {
        toast.error("Invalid or expired code");
      }
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
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
          <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">
            Your email has been successfully verified. You now have full access to all features.
          </p>
          <Button asChild>
            <a href="/">Go to Dashboard</a>
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
          <p className="text-muted-foreground">
            We'll send a 6-digit code to <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        <div className="space-y-6">
          {resendCooldown === 0 ? (
            <Button
              onClick={sendVerificationCode}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          ) : (
            <>
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
                onClick={verifyCode}
                disabled={loading || code.join("").length < 6}
                className="w-full"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-medium text-foreground">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={sendVerificationCode}
                    disabled={loading}
                    className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
                  >
                    <RefreshCw className="h-3 w-3" /> Resend code
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Skip for now
          </a>
        </div>
      </div>
    </div>
  );
}
