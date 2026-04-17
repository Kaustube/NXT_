import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Hash, Volume2, Send, Users as UsersIcon, Pin, Smile, AtSign, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Server = { id: string; name: string; slug: string; kind: "college" | "global"; description: string | null; college_id: string | null };
type Channel = { id: string; server_id: string; name: string; type: "text" | "voice"; position: number };
type Message = { id: string; channel_id: string; author_id: string; content: string; created_at: string };
type ProfileLite = { user_id: string; display_name: string; username: string; avatar_url: string | null };

export default function Servers() {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [memberships, setMemberships] = useState<Set<string>>(new Set());
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ProfileLite[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [draft, setDraft] = useState("");
  const [myCollegeId, setMyCollegeId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load servers + memberships + my college
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: s }, { data: m }, { data: me }] = await Promise.all([
        supabase.from("servers").select("*").order("kind").order("name"),
        supabase.from("server_members").select("server_id").eq("user_id", user.id),
        supabase.from("profiles").select("college_id").eq("user_id", user.id).maybeSingle(),
      ]);
      setServers((s as Server[]) ?? []);
      setMemberships(new Set((m ?? []).map((x: any) => x.server_id)));
      setMyCollegeId((me as any)?.college_id ?? null);
      if (s && s.length && !activeServer) setActiveServer(s[0] as Server);
    })();
  }, [user]);

  // Load channels & members when server changes
  useEffect(() => {
    if (!activeServer) return;
    (async () => {
      const [{ data: c }, { data: sm }] = await Promise.all([
        supabase.from("channels").select("*").eq("server_id", activeServer.id).order("position"),
        supabase.from("server_members").select("user_id").eq("server_id", activeServer.id),
      ]);
      const chs = (c as Channel[]) ?? [];
      setChannels(chs);
      const firstText = chs.find((x) => x.type === "text") ?? chs[0] ?? null;
      setActiveChannel(firstText);

      const ids = (sm ?? []).map((x: any) => x.user_id);
      if (ids.length) {
        const { data: pf } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", ids);
        setMembers((pf as ProfileLite[]) ?? []);
      } else {
        setMembers([]);
      }
    })();
  }, [activeServer]);

  // Load + subscribe messages for channel
  useEffect(() => {
    if (!activeChannel) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("channel_messages")
        .select("*")
        .eq("channel_id", activeChannel.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (error) {
        // Likely not a member
        setMessages([]);
      } else {
        setMessages((data as Message[]) ?? []);
        await ensureProfiles((data as Message[]) ?? []);
      }
    })();

    const channel = supabase
      .channel(`ch:${activeChannel.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${activeChannel.id}` },
        async (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => [...prev, m]);
          await ensureProfiles([m]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeChannel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function ensureProfiles(msgs: Message[]) {
    const need = msgs.map((m) => m.author_id).filter((id) => !profiles[id]);
    if (!need.length) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", need);
    setProfiles((prev) => {
      const next = { ...prev };
      (data ?? []).forEach((p: any) => (next[p.user_id] = p));
      return next;
    });
  }

  async function joinServer() {
    if (!user || !activeServer) return;

    // Frontend guard: college servers require matching college
    if (activeServer.kind === "college") {
      if (!myCollegeId) {
        toast.error("Your account isn't linked to a college. Update your profile first.");
        return;
      }
      if (myCollegeId !== activeServer.college_id) {
        toast.error("This server is only open to students from that college.");
        return;
      }
    }

    const { error } = await supabase.from("server_members").insert({ server_id: activeServer.id, user_id: user.id });
    if (error) toast.error(error.message);
    else {
      setMemberships(new Set([...memberships, activeServer.id]));
      toast.success(`Joined ${activeServer.name}`);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeChannel || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("channel_messages").insert({
      channel_id: activeChannel.id,
      author_id: user.id,
      content,
    });
    if (error) toast.error(error.message);
  }

  const collegeServers = useMemo(() => servers.filter((s) => s.kind === "college"), [servers]);
  const globalServers = useMemo(() => servers.filter((s) => s.kind === "global"), [servers]);
  const isMember = activeServer ? memberships.has(activeServer.id) : false;

  // Can the user join this server?
  const canJoin = !activeServer ? false
    : activeServer.kind === "global"
    ? true
    : myCollegeId !== null && myCollegeId === activeServer.college_id;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Server rail */}
      <div className="w-16 shrink-0 border-r border-border bg-[hsl(var(--surface-1))] py-3 flex flex-col items-center gap-2 overflow-auto">
        {collegeServers.map((s) => (
          <ServerIcon key={s.id} server={s} active={activeServer?.id === s.id}
            locked={s.kind === "college" && !memberships.has(s.id) && !(myCollegeId && myCollegeId === s.college_id)}
            onClick={() => setActiveServer(s)} />
        ))}
        <div className="h-px w-8 bg-border my-1" />
        {globalServers.map((s) => (
          <ServerIcon key={s.id} server={s} active={activeServer?.id === s.id} onClick={() => setActiveServer(s)} />
        ))}
      </div>

      {/* Channel sidebar */}
      <div className="w-60 shrink-0 hidden md:flex flex-col border-r border-border bg-[hsl(var(--sidebar-background))]">
        <div className="px-4 h-12 flex items-center justify-between border-b border-border">
          <div className="text-sm font-semibold truncate">{activeServer?.name ?? "—"}</div>
          {isMember && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">Member</span>
          )}
        </div>
        {activeServer?.description && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/50 bg-[hsl(var(--surface-1))]">
            {activeServer.description}
          </div>
        )}
        <div className="flex-1 overflow-auto p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mt-1 mb-1">Text Channels</div>
          {channels.filter(c => c.type === "text").map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChannel(c)}
              className={`w-full nav-item ${activeChannel?.id === c.id ? "nav-item-active" : ""}`}
            >
              <Hash className="h-4 w-4" />
              <span className="flex-1 text-left">{c.name}</span>
            </button>
          ))}
          {channels.filter(c => c.type === "voice").length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mt-3 mb-1">Voice Channels</div>
              {channels.filter(c => c.type === "voice").map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannel(c)}
                  className={`w-full nav-item ${activeChannel?.id === c.id ? "nav-item-active" : ""}`}
                >
                  <Volume2 className="h-4 w-4" />
                  <span className="flex-1 text-left">{c.name}</span>
                  {activeChannel?.id === c.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(var(--success))]" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-12 hairline px-4 flex items-center gap-2">
          {activeChannel && (
            <>
              {activeChannel.type === "text" ? <Hash className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-success" />}
              <span className="text-sm font-bold">{activeChannel.name}</span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{activeServer?.description}</span>
            </>
          )}
        </div>

        {!isMember ? (
          <div className="flex-1 grid place-items-center p-6">
            <div className="text-center max-w-sm panel p-8 flex flex-col items-center">
              <div className="h-16 w-16 bg-[hsl(var(--surface-3))] rounded-2xl grid place-items-center mb-6">
                <UsersIcon className="h-8 w-8 text-primary" />
              </div>
              <div className="font-display font-bold text-3xl mb-3 text-foreground glow-accent">
                {canJoin ? `Join ${activeServer?.name}` : activeServer?.name}
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {activeServer?.description || "A secure space for students."}
              </p>

              {canJoin ? (
                <button onClick={joinServer}
                  className="h-10 px-8 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:shadow-[0_0_15px_hsl(var(--primary)/0.5)] transition-all">
                  Join server
                </button>
              ) : (
                <div className="w-full">
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium mb-3">
                    <span>🔒</span>
                    <span>College-only server</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {!myCollegeId
                      ? "Your account isn't linked to a college. Update your profile to join college servers."
                      : "This server is only open to students from that college."}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeChannel?.type === "voice" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="h-32 w-32 rounded-full bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)] grid place-items-center mb-8 relative">
               <div className="absolute inset-0 rounded-full animate-ping bg-[hsl(var(--primary)/0.1)] opacity-75"></div>
               <div className="h-24 w-24 rounded-full bg-[hsl(var(--primary)/0.2)] grid place-items-center z-10 glow-primary shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                 <Volume2 className="h-10 w-10 text-primary animate-pulse" />
               </div>
            </div>
            <h2 className="text-3xl font-bold font-display mb-3 text-foreground glow-accent">Connected to {activeChannel.name}</h2>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed mb-10">
              You are currently in a secure voice broadcast. In this demonstration environment, microphone input is mocked to maintain local privacy.
            </p>
            <div className="flex gap-4">
              <button className="h-12 px-8 rounded-full bg-[hsl(var(--surface-2))] border border-border flex items-center justify-center text-sm font-medium hover:bg-[hsl(var(--surface-3))] transition">
                Mute Microphone
              </button>
              <button onClick={() => setActiveChannel(channels.find(c => c.type === 'text') || null)} className="h-12 px-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-sm font-bold hover:opacity-90 transition shadow-[0_0_15px_hsl(var(--destructive)/0.3)]">
                Leave Voice
              </button>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-6 panel-2 max-w-xs">
                     <Hash className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                     <div className="text-sm font-semibold mb-1">Welcome to #{activeChannel?.name}</div>
                     <div className="text-xs text-muted-foreground">Be the first to start the conversation!</div>
                  </div>
                </div>
              )}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const sameAuthor = prev && prev.author_id === m.author_id && +new Date(m.created_at) - +new Date(prev.created_at) < 5 * 60 * 1000;
                const p = profiles[m.author_id];
                return (
                   <div key={m.id} className={`flex gap-3 group ${sameAuthor ? "" : "mt-4"}`}>
                    {sameAuthor ? (
                      <div className="w-9 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                         <span className="text-[9px] text-muted-foreground font-mono">{format(new Date(m.created_at), "HH:mm")}</span>
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-[hsl(var(--surface-3))] border border-border grid place-items-center text-xs font-bold shrink-0 shadow-sm">
                        {(p?.display_name ?? "?")[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      {!sameAuthor && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground/90">{p?.display_name ?? "Loading…"}</span>
                          <span className="text-[10px] text-muted-foreground lowercase opacity-70">{format(new Date(m.created_at), "MMM d, h:mm a")}</span>
                        </div>
                      )}
                      <div className="text-[14px] leading-[1.6] text-foreground/80 break-words">{m.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="px-4 py-4 backdrop-blur-md bg-background/50 border-t border-border/50">
              <div className="flex items-center gap-2 relative">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message #${activeChannel?.name ?? ""}`}
                  className="flex-1 h-11 pl-4 pr-24 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring transition-all placeholder:text-muted-foreground/50"
                />
                <button type="submit" className="absolute right-1 top-1 bottom-1 px-4 rounded-md bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5 hover:shadow-[0_0_10px_hsl(var(--primary)/0.3)] transition-all">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Members */}
      <div className="w-56 shrink-0 hidden xl:flex flex-col border-l border-border bg-[hsl(var(--surface-1))]">
        <div className="h-12 px-4 flex items-center border-b border-border gap-2">
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Members</span>
          <span className="text-xs text-muted-foreground ml-auto">{members.length}</span>
        </div>
        <div className="flex-1 overflow-auto p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2">Online — {members.length}</div>
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[hsl(var(--surface-2))] group cursor-pointer">
              <div className="relative shrink-0">
                <div className="h-8 w-8 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold overflow-hidden">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.display_name} className="h-full w-full object-cover" />
                  ) : (
                    m.display_name[0]
                  )}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-[hsl(var(--surface-1))]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate font-medium">{m.display_name}</div>
                <div className="text-xs text-muted-foreground truncate">@{m.username}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServerIcon({ server, active, onClick, locked }: { server: Server; active: boolean; onClick: () => void; locked?: boolean }) {
  const initials = server.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <button
      onClick={onClick}
      title={locked ? `${server.name} (college only)` : server.name}
      className={`relative h-10 w-10 rounded-md grid place-items-center text-xs font-semibold transition-all
        ${active ? "bg-primary text-primary-foreground" : "bg-[hsl(var(--surface-2))] text-foreground hover:bg-[hsl(var(--surface-3))]"}
        ${locked ? "opacity-50" : ""}`}
    >
      {initials}
      {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r bg-primary" />}
      {locked && !active && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[hsl(var(--surface-1))] border border-border grid place-items-center text-[8px]">🔒</span>
      )}
    </button>
  );
}
