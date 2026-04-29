import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Profile = { user_id: string; display_name: string; username: string; avatar_url: string | null };
type Conversation = { id: string; user_a: string; user_b: string };
type DM = { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };

export default function Messages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const peerParam = params.get("with");

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const { data: pf } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", peerIds);
      const map: Record<string, Profile> = {};
      (pf ?? []).forEach((p: any) => (map[p.user_id] = p));
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
      if (error) {
        toast.error(error.message);
        return;
      }
      conv = data as Conversation;
    }
    if (!profiles[peerId]) {
      const { data: pf } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").eq("user_id", peerId).maybeSingle();
      if (pf) setProfiles((prev) => ({ ...prev, [peerId]: pf as Profile }));
    }
    await loadConvs();
    setActive(conv);
  }

  // Load + subscribe DMs
  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", active.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) setMessages((data as DM[]) ?? []);
    })();

    const ch = supabase
      .channel(`dm:${active.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${active.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as DM]),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const peer = useMemo(() => {
    if (!active || !user) return null;
    const id = active.user_a === user.id ? active.user_b : active.user_a;
    return profiles[id] ?? null;
  }, [active, user, profiles]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !active || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: active.id,
      sender_id: user.id,
      content,
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]" style={{ height: 'calc(100dvh - 3.5rem - env(safe-area-inset-bottom, 0px))' }}>
      {/* Conversation list — full width on mobile when no active conv */}
      <div className={`border-r border-border bg-[hsl(var(--surface-1))] flex flex-col ${active ? 'hidden md:flex md:w-72' : 'flex w-full md:w-72'}`}>
        <div className="h-12 px-4 flex items-center border-b border-border">
          <div className="text-sm font-semibold">Direct messages</div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {convs.length === 0 && (
            <div className="text-sm text-muted-foreground p-4">
              No conversations yet. Start one from someone's profile in <span className="text-foreground">Network</span>.
            </div>
          )}
          {convs.map((c) => {
            const peerId = c.user_a === user?.id ? c.user_b : c.user_a;
            const p = profiles[peerId];
            const isActive = active?.id === c.id;
            return (
              <button key={c.id} onClick={() => setActive(c)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-left ${isActive ? "bg-[hsl(var(--surface-3))]" : "hover:bg-[hsl(var(--surface-2))]"}`}>
                <div className="h-9 w-9 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-sm font-bold shrink-0">
                  {(p?.display_name ?? "?")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p?.display_name ?? "Loading…"}</div>
                  <div className="text-xs text-muted-foreground truncate">@{p?.username ?? ""}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel — full width on mobile when active */}
      <div className={`flex-1 min-w-0 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
        {!active ? (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Select a conversation</div>
        ) : (
          <>
            <div className="h-12 hairline px-4 flex items-center gap-2">
              {/* Mobile back button */}
              <button
                className="md:hidden h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground mr-1"
                onClick={() => setActive(null)}
              >
                ‹
              </button>
              <div className="h-7 w-7 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold shrink-0">
                {(peer?.display_name ?? "?")[0]}
              </div>
              <div>
                <div className="text-sm font-medium leading-none">{peer?.display_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">@{peer?.username ?? ""}</div>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 space-y-2">
              {messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-10">Say hi 👋</div>}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-[hsl(var(--surface-2))] text-foreground rounded-bl-sm"}`}>
                      <div className="break-words">{m.content}</div>
                      <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {format(new Date(m.created_at), "h:mm a")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="flex-1 h-11 px-4 rounded-full bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring" />
                <button type="submit"
                  className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center hover:opacity-90 shrink-0">
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
