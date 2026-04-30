import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user?.email) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: code, error: rpcErr } = await admin.rpc("resend_verification_code", {
    p_user_id: user.id,
    p_email: user.email,
  });

  if (rpcErr) {
    const status = rpcErr.message?.includes("wait") ? 429 : 400;
    return new Response(JSON.stringify({ error: rpcErr.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!code || typeof code !== "string") {
    return new Response(JSON.stringify({ error: "Could not generate verification code" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "NXT Campus <onboarding@resend.dev>";

  if (!resendKey) {
    return new Response(
      JSON.stringify({
        error:
          "RESEND_API_KEY is not set. In Supabase: Project Settings → Edge Functions → Secrets → add RESEND_API_KEY from https://resend.com. Optional: RESEND_FROM_EMAIL (e.g. NXT <verify@yourdomain.com>). Also turn off “Confirm email” in Auth → Providers → Email so signup returns a session and this flow can run.",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [user.email],
      subject: "Your NXT Campus verification code",
      html: `<p>Your verification code is:</p><p style="font-size:26px;font-weight:700;letter-spacing:6px;font-family:monospace">${escapeHtml(code)}</p><p>This code expires in 15 minutes.</p><p>If you did not create an account, you can ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return new Response(
      JSON.stringify({
        error:
          `Resend rejected the message (${res.status}). Check RESEND_FROM_EMAIL and your Resend domain. Details: ${body}`,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
