import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Profile = {
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  college_id: string | null;
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: pf }, { data: cs }, { data: conns }, { data: me }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, bio, skills, interests, college_id").neq("user_id", user.id).order("display_name"),
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
      if (filter === "connected") {
        const s = statusFor(p.user_id);
        if (s?.status !== "accepted") return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.display_name.toLowerCase().includes(q) && !p.username.toLowerCase().includes(q) && !p.skills.join(" ").toLowerCase().includes(q)) {
          return false;
        }
      }
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
          <div className="text-sm font-semibold mb-3">Incoming requests</div>
          <div className="space-y-2">
            {incoming.map((c) => {
              const p = profiles.find((x) => x.user_id === c.requester_id);
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="text-sm">{p?.display_name ?? "Someone"} wants to connect</div>
                  <button onClick={() => accept(c)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">Accept</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, username or skill"
          className="flex-1 min-w-[220px] h-9 px-3 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
        />
        {(["all", "mine", "connected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-9 px-3 rounded-md text-sm border ${filter === f ? "bg-[hsl(var(--surface-3))] border-border text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
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
            <div key={p.user_id} className="panel p-4 flex flex-col">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-sm">{p.display_name[0]}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.display_name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{p.username}{college ? ` · ${college}` : ""}</div>
                </div>
              </div>
              {p.bio && <div className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.bio}</div>}
              {p.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.skills.slice(0, 4).map((s) => (
                    <span key={s} className="chip">{s}</span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2">
                {!s && (
                  <button onClick={() => connect(p.user_id)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">Connect</button>
                )}
                {s?.status === "pending" && (
                  <span className="text-xs text-muted-foreground">Request pending</span>
                )}
                {s?.status === "accepted" && (
                  <span className="text-xs text-success">Connected</span>
                )}
                <button onClick={() => navigate(`/messages?with=${p.user_id}`)} className="h-8 px-3 rounded-md border border-border text-xs">Message</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-sm text-muted-foreground py-10 text-center col-span-full">No one matches that.</div>}
      </div>
    </div>
  );
}
