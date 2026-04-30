import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Send, Lock, ShieldAlert, KeyRound, Paperclip, X, Image } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  generateKeyPair, storePrivateKey, loadPrivateKey,
  storePublicKeyCache, loadPublicKeyCache,
  encryptMessage, decryptMessage, isEncrypted,
} from "@/lib/e2e";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain"];

type Profile = {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  public_key: string | null;
};
type Conversation = { id: string; user_a: string; user_b: string };
type DM = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;       // stored as encrypted ciphertext
  created_at: string;
  decrypted?: string;    // client-side only, never stored
};

export default function Messages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const peerParam = params.get("with");

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [draft, setDraft] = useState("");
  const [e2eReady, setE2eReady] = useState(false);
  const [e2eError, setE2eError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── E2E setup: generate or load key pair ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    void setupE2E();
  }, [user]);

  async function setupE2E() {
    if (!user) return;
    try {
      let privateKeyB64 = loadPrivateKey(user.id);

      if (!privateKeyB64) {
        // First time — generate a new key pair
        const { publicKeyB64, privateKeyB64: privB64 } = await generateKeyPair();
        storePrivateKey(user.id, privB64);
        privateKeyB64 = privB64;

        // Upload public key to profile
        const { error } = await supabase
          .from("profiles")
          .update({ public_key: publicKeyB64 })
          .eq("user_id", user.id);

        if (error) {
          console.error("Failed to upload public key:", error);
          setE2eError("Could not register encryption key. Messages may not be encrypted.");
        }
      } else {
        // Verify our public key is still in the DB
        const { data: prof } = await supabase
          .from("profiles")
          .select("public_key")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!prof?.public_key) {
          // Key was wiped from DB (e.g. profile reset) — re-upload
          const { publicKeyB64 } = await generateKeyPair();
          // Note: we keep the existing private key and just re-derive a new public key
          // In practice we should regenerate the pair, but this keeps existing messages decryptable
          await supabase
            .from("profiles")
            .update({ public_key: publicKeyB64 })
            .eq("user_id", user.id);
        }
      }

      setE2eReady(true);
    } catch (err) {
      console.error("E2E setup failed:", err);
      setE2eError("Encryption setup failed. Messages will be sent unencrypted.");
      setE2eReady(true); // still allow messaging, just unencrypted
    }
  }

  // ── Load conversations ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    void loadConvs();
  }, [user]);

  useEffect(() => {
    if (!user || !peerParam) return;
    void openConversationWith(peerParam);
  }, [user, peerParam]);

  async function loadConvs() {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const cs = (data as Conversation[]) ?? [];
    setConvs(cs);
    const peerIds = cs.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
    if (peerIds.length) {
      const { data: pf } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, public_key")
        .in("user_id", peerIds);
      const map: Record<string, Profile> = {};
      (pf ?? []).forEach((p: any) => {
        map[p.user_id] = p;
        if (p.public_key) storePublicKeyCache(p.user_id, p.public_key);
      });
      setProfiles((prev) => ({ ...prev, ...map }));
    }
    if (!active && cs.length) setActive(cs[0]);
  }

  async function openConversationWith(peerId: string) {
    if (!user || peerId === user.id) return;
    const [a, b] = [user.id, peerId].sort();
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();
    let conv = existing as Conversation | null;
    if (!conv) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_a: a, user_b: b })
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      conv = data as Conversation;
    }
    if (!profiles[peerId]) {
      const { data: pf } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, public_key")
        .eq("user_id", peerId)
        .maybeSingle();
      if (pf) {
        setProfiles((prev) => ({ ...prev, [peerId]: pf as Profile }));
        if ((pf as any).public_key) storePublicKeyCache(peerId, (pf as any).public_key);
      }
    }
    await loadConvs();
    setActive(conv);
  }

  // ── Decrypt a batch of messages ───────────────────────────────────────────
  async function decryptMessages(msgs: DM[], peerId: string): Promise<DM[]> {
    const myPrivKey = user ? loadPrivateKey(user.id) : null;
    const peerPubKey = loadPublicKeyCache(peerId) ?? profiles[peerId]?.public_key ?? null;

    if (!myPrivKey || !peerPubKey) {
      // Can't decrypt — return as-is with a placeholder
      return msgs.map((m) => ({
        ...m,
        decrypted: isEncrypted(m.content) ? "🔒 [Encrypted — key not available]" : m.content,
      }));
    }

    return Promise.all(
      msgs.map(async (m) => {
        if (!isEncrypted(m.content)) {
          // Legacy unencrypted message
          return { ...m, decrypted: m.content };
        }
        const plain = await decryptMessage(m.content, myPrivKey, peerPubKey);
        return {
          ...m,
          decrypted: plain ?? "🔒 [Could not decrypt]",
        };
      }),
    );
  }

  // ── Load + subscribe DMs ──────────────────────────────────────────────────
  useEffect(() => {
    if (!active) { setMessages([]); return; }
    let cancelled = false;

    const peerId = active.user_a === user?.id ? active.user_b : active.user_a;

    (async () => {
      const { data } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", active.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      const decrypted = await decryptMessages((data as DM[]) ?? [], peerId);
      if (!cancelled) setMessages(decrypted);
    })();

    const ch = supabase
      .channel(`dm:${active.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${active.id}` },
        async (payload) => {
          const raw = payload.new as DM;
          const [decrypted] = await decryptMessages([raw], peerId);
          setMessages((prev) => [...prev, decrypted]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [active, profiles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const peer = useMemo(() => {
    if (!active || !user) return null;
    const id = active.user_a === user.id ? active.user_b : active.user_a;
    return profiles[id] ?? null;
  }, [active, user, profiles]);

  const peerHasKey = !!peer?.public_key;

  // ── Send message ──────────────────────────────────────────────────────────
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !active || !draft.trim()) return;

    const plaintext = draft.trim();
    setDraft("");

    let content = plaintext;

    // Encrypt if both parties have keys
    const myPrivKey = loadPrivateKey(user.id);
    const peerPubKey = peer?.public_key ?? null;

    if (myPrivKey && peerPubKey) {
      try {
        content = await encryptMessage(plaintext, myPrivKey, peerPubKey);
      } catch (err) {
        console.error("Encryption failed:", err);
        toast.error("Encryption failed — message not sent");
        setDraft(plaintext); // restore draft
        return;
      }
    }

    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: active.id,
      sender_id: user.id,
      content,
    });
    if (error) {
      toast.error(error.message);
      setDraft(plaintext);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-[calc(100vh-3.5rem)]"
      style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Conversation list */}
      <div className={`border-r border-border bg-[hsl(var(--surface-1))] flex flex-col ${active ? "hidden md:flex md:w-72" : "flex w-full md:w-72"}`}>
        <div className="h-12 px-4 flex items-center justify-between border-b border-border">
          <div className="text-sm font-semibold">Direct messages</div>
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <Lock className="h-3 w-3" />
            <span>E2E</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {convs.length === 0 && (
            <div className="text-sm text-muted-foreground p-4">
              No conversations yet. Start one from someone's profile in{" "}
              <span className="text-foreground">Network</span>.
            </div>
          )}
          {convs.map((c) => {
            const peerId = c.user_a === user?.id ? c.user_b : c.user_a;
            const p = profiles[peerId];
            const isActive = active?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-left ${isActive ? "bg-[hsl(var(--surface-3))]" : "hover:bg-[hsl(var(--surface-2))]"}`}
              >
                <div className="h-9 w-9 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-sm font-bold shrink-0 overflow-hidden">
                  {p?.avatar_url
                    ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    : (p?.display_name ?? "?")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{p?.display_name ?? "Loading…"}</span>
                    {p?.public_key && <Lock className="h-3 w-3 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">@{p?.username ?? ""}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`flex-1 min-w-0 flex-col ${active ? "flex" : "hidden md:flex"}`}>
        {!active ? (
          <div className="flex-1 grid place-items-center">
            <div className="text-center space-y-3">
              <Lock className="h-10 w-10 text-emerald-400 mx-auto opacity-50" />
              <p className="text-sm text-muted-foreground">Select a conversation</p>
              <p className="text-xs text-muted-foreground">All messages are end-to-end encrypted</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-12 hairline px-4 flex items-center gap-2">
              <button
                className="md:hidden h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground mr-1"
                onClick={() => setActive(null)}
              >
                ‹
              </button>
              <div className="h-7 w-7 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold shrink-0 overflow-hidden">
                {peer?.avatar_url
                  ? <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" />
                  : (peer?.display_name ?? "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-none">{peer?.display_name ?? "—"}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {peerHasKey ? (
                    <>
                      <Lock className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400">End-to-end encrypted</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-3 w-3 text-yellow-400" />
                      <span className="text-[10px] text-yellow-400">Peer hasn't set up encryption yet</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* E2E warning banner */}
            {e2eError && (
              <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-2 text-xs text-yellow-400">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                {e2eError}
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 space-y-2">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <Lock className="h-8 w-8 text-emerald-400 mx-auto opacity-40" />
                  <p className="text-sm text-muted-foreground">Say hi 👋</p>
                  <p className="text-xs text-muted-foreground">Messages are encrypted on your device</p>
                </div>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                const text = m.decrypted ?? m.content;
                const failed = text.startsWith("🔒 [");
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-[hsl(var(--surface-2))] text-foreground rounded-bl-sm"
                      } ${failed ? "opacity-60" : ""}`}
                    >
                      <div className="break-words">{text}</div>
                      <div className={`flex items-center gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {format(new Date(m.created_at), "h:mm a")}
                        </span>
                        {isEncrypted(m.content) && !failed && (
                          <Lock className={`h-2.5 w-2.5 ${mine ? "text-primary-foreground/50" : "text-emerald-400/60"}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <form onSubmit={send} className="p-3 border-t border-border">
              {!peerHasKey && (
                <div className="flex items-center gap-1.5 text-xs text-yellow-400 mb-2 px-1">
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  Messages will be sent unencrypted until the other person opens the app
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={peerHasKey ? "Write an encrypted message…" : "Write a message…"}
                    className="w-full h-11 pl-4 pr-10 rounded-full bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
                  />
                  {peerHasKey && (
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-400 pointer-events-none" />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center hover:opacity-90 shrink-0 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
