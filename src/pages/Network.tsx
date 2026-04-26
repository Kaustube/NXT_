import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Search, X, Globe, Lock, UserPlus, MessageSquare, Check } from "lucide-react";

type Profile = {
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  college_id: string | null;
  avatar_url: string | null;
  profile_visibility: "public" | "private";
};
type College = { id: string; short_code: string; name: string };
type Conn = { id: string; requester_id: string; recipient_id: string; status: "pending" | "accepted" | "declined" };

export default function Network() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [colleges, setColleges] = useState<Record<string, College>>({});
  const [connections, setConnections] = useState<Conn[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "connected">("all");
  const [search, setSearch] = useState("");
  const [meCollege, setMeCollege] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: pf }, { data: cs }, { data: conns }, { data: me }] = await Promise.all([
        supabase.from("profiles")
          .select("user_id, display_name, username, bio, skills, interests, college_id, avatar_url, profile_visibility")
          .neq("user_id", user.id)
          .order("display_name"),
        supabase.from("colleges").select("*"),
        supabase.from("connections").select("*").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
        supabase.from("profiles").select("college_id").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfiles((pf as Profile[]) ?? []);
      const cmap: Record<string, College> = {};
      (cs ?? []).forEach((c: any) => (cmap[c.id] = c));
      setColleges(cmap);
      setConnections((conns as Conn[]) ?? []);
      setMeCollege((me as any)?.college_id ?? null);
    })();
  }, [user]);

  function statusFor(other: string): Conn | null {
    return connections.find(
      (c) => (c.requester_id === user?.id && c.recipient_id === other) || (c.recipient_id === user?.id && c.requester_id === other),
    ) ?? null;
  }

  function isConnected(other: string) {
    return statusFor(other)?.status === "accepted";
  }

  // Private profiles only visible if connected OR searching by username (partial match)
  function canViewProfile(p: Profile): boolean {
    if (p.profile_visibility === "public") return true;
    if (isConnected(p.user_id)) return true;
    // Allow finding by username search (partial match)
    if (search.trim() && p.username.toLowerCase().includes(search.trim().toLowerCase())) return true;
    return false;
  }

  async function connect(other: string) {
    if (!user) return;
    const { error } = await supabase.from("connections").insert({ requester_id: user.id, recipient_id: other, status: "pending" });
    if (error) toast.error(error.message);
    else {
      const { data } = await supabase.from("connections").select("*").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
      setConnections((data as Conn[]) ?? []);
      toast.success("Request sent");
    }
  }

  async function accept(c: Conn) {
    await supabase.from("connections").update({ status: "accepted" }).eq("id", c.id);
    setConnections((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "accepted" } : x)));
  }

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (filter === "mine" && p.college_id !== meCollege) return false;
      if (filter === "connected" && !isConnected(p.user_id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesBasic = p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || p.skills.join(" ").toLowerCase().includes(q);
        if (!matchesBasic) return false;
      }
      // Hide private profiles unless connected or exact username match
      if (!canViewProfile(p)) return false;
      return true;
    });
  }, [profiles, filter, search, meCollege, connections]);

  const incoming = connections.filter((c) => c.recipient_id === user?.id && c.status === "pending");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Network</div>
        <h1 className="font-display text-4xl mt-1">People</h1>
      </div>

      {incoming.length > 0 && (
        <div className="panel p-4">
          <div className="text-sm font-semibold mb-3">Incoming requests ({incoming.length})</div>
          <div className="space-y-2">
            {incoming.map((c) => {
              const p = profiles.find((x) => x.user_id === c.requester_id);
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold overflow-hidden">
                      {p?.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : (p?.display_name ?? "?")[0]}
                    </div>
                    <div className="text-sm"><span className="font-medium">{p?.display_name ?? "Someone"}</span> wants to connect</div>
                  </div>
                  <button onClick={() => accept(c)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username or skill…"
            className="w-full h-9 pl-9 pr-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
          />
        </div>
        {(["all", "mine", "connected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-9 px-3 rounded-md text-sm border transition-colors ${filter === f ? "bg-[hsl(var(--surface-3))] border-border text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f === "all" ? "Everyone" : f === "mine" ? "My college" : "Connected"}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => {
          const s = statusFor(p.user_id);
          const college = p.college_id ? colleges[p.college_id]?.short_code : null;
          return (
            <div
              key={p.user_id}
              className="panel p-4 flex flex-col cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => setSelectedProfile(p)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-sm font-bold overflow-hidden shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : p.display_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-medium truncate">{p.display_name}</div>
                    {p.profile_visibility === "private" && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">@{p.username}{college ? ` · ${college}` : ""}</div>
                </div>
              </div>
              {p.bio && <div className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.bio}</div>}
              {p.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.skills.slice(0, 3).map((sk) => (
                    <span key={sk} className="chip text-xs">{sk}</span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {!s && (
                  <button onClick={() => connect(p.user_id)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" /> Connect
                  </button>
                )}
                {s?.status === "pending" && s.requester_id === user?.id && (
                  <span className="text-xs text-muted-foreground">Request pending</span>
                )}
                {s?.status === "pending" && s.recipient_id === user?.id && (
                  <button onClick={() => accept(s)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                )}
                {s?.status === "accepted" && (
                  <span className="text-xs text-emerald-400 font-medium">✓ Connected</span>
                )}
                <button
                  onClick={() => navigate(`/messages?with=${p.user_id}`)}
                  className="h-8 px-3 rounded-md border border-border text-xs flex items-center gap-1.5 hover:bg-[hsl(var(--surface-2))]"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Message
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground py-10 text-center col-span-full">
            {search ? "No one matches that search. Private profiles can be found by exact username." : "No one here yet."}
          </div>
        )}
      </div>

      {/* Profile mini-modal */}
      {selectedProfile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="panel w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-[hsl(var(--surface-3))] grid place-items-center text-xl font-bold overflow-hidden">
                  {selectedProfile.avatar_url
                    ? <img src={selectedProfile.avatar_url} className="h-full w-full object-cover" />
                    : selectedProfile.display_name[0]}
                </div>
                <div>
                  <div className="font-bold text-lg flex items-center gap-1.5">
                    {selectedProfile.display_name}
                    {selectedProfile.profile_visibility === "private"
                      ? <Lock className="h-3.5 w-3.5 text-orange-400" />
                      : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="text-sm text-muted-foreground">@{selectedProfile.username}</div>
                  {selectedProfile.college_id && colleges[selectedProfile.college_id] && (
                    <div className="text-xs text-muted-foreground mt-0.5">{colleges[selectedProfile.college_id].name}</div>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedProfile.bio && (
              <p className="text-sm text-foreground/80 leading-relaxed">{selectedProfile.bio}</p>
            )}

            {selectedProfile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedProfile.skills.map((sk) => (
                  <span key={sk} className="chip text-xs">{sk}</span>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {(() => {
                const s = statusFor(selectedProfile.user_id);
                return (
                  <>
                    {!s && (
                      <button
                        onClick={() => { connect(selectedProfile.user_id); setSelectedProfile(null); }}
                        className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90"
                      >
                        <UserPlus className="h-4 w-4" /> Connect
                      </button>
                    )}
                    {s?.status === "pending" && s.requester_id === user?.id && (
                      <div className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground flex items-center justify-center">
                        Request pending
                      </div>
                    )}
                    {s?.status === "pending" && s.recipient_id === user?.id && (
                      <button
                        onClick={() => { accept(s); setSelectedProfile(null); }}
                        className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90"
                      >
                        <Check className="h-4 w-4" /> Accept request
                      </button>
                    )}
                    {s?.status === "accepted" && (
                      <div className="flex-1 h-9 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium flex items-center justify-center gap-1.5">
                        ✓ Connected
                      </div>
                    )}
                    <button
                      onClick={() => { navigate(`/messages?with=${selectedProfile.user_id}`); setSelectedProfile(null); }}
                      className="flex-1 h-9 rounded-lg border border-border text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[hsl(var(--surface-2))]"
                    >
                      <MessageSquare className="h-4 w-4" /> Message
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
