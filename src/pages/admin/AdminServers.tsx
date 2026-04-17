import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Check, X, Hash, Volume2, Server } from "lucide-react";

type ServerRow = {
  id: string;
  name: string;
  slug: string;
  kind: "college" | "global";
  description: string | null;
  college_id: string | null;
  created_at: string;
  memberCount?: number;
  channelCount?: number;
};

type Channel = {
  id: string;
  server_id: string;
  name: string;
  type: "text" | "voice";
  position: number;
};

type College = { id: string; name: string; short_code: string };

export default function AdminServers() {
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeServer, setActiveServer] = useState<ServerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showServerForm, setShowServerForm] = useState(false);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerRow | null>(null);
  const [serverForm, setServerForm] = useState({ name: "", slug: "", kind: "global" as "college" | "global", description: "", college_id: "" });
  const [channelForm, setChannelForm] = useState({ name: "", type: "text" as "text" | "voice" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: c }, { data: sm }, { data: ch }] = await Promise.all([
      supabase.from("servers").select("*").order("kind").order("name"),
      supabase.from("colleges").select("*"),
      supabase.from("server_members").select("server_id"),
      supabase.from("channels").select("*"),
    ]);

    const memberCounts: Record<string, number> = {};
    (sm ?? []).forEach((m: any) => { memberCounts[m.server_id] = (memberCounts[m.server_id] ?? 0) + 1; });
    const channelCounts: Record<string, number> = {};
    (ch ?? []).forEach((c: any) => { channelCounts[c.server_id] = (channelCounts[c.server_id] ?? 0) + 1; });

    setServers((s ?? []).map((sv: any) => ({
      ...sv,
      memberCount: memberCounts[sv.id] ?? 0,
      channelCount: channelCounts[sv.id] ?? 0,
    })));
    setColleges((c as College[]) ?? []);
    setLoading(false);
  }

  async function loadChannels(serverId: string) {
    const { data } = await supabase.from("channels").select("*").eq("server_id", serverId).order("position");
    setChannels((data as Channel[]) ?? []);
  }

  function selectServer(s: ServerRow) {
    setActiveServer(s);
    void loadChannels(s.id);
  }

  async function saveServer() {
    if (!serverForm.name.trim() || !serverForm.slug.trim()) { toast.error("Name and slug required"); return; }
    setSaving(true);
    const payload = {
      name: serverForm.name.trim(),
      slug: serverForm.slug.trim().toLowerCase(),
      kind: serverForm.kind,
      description: serverForm.description.trim() || null,
      college_id: serverForm.college_id || null,
    };
    let error;
    if (editingServer) {
      ({ error } = await supabase.from("servers").update(payload).eq("id", editingServer.id));
    } else {
      ({ error } = await supabase.from("servers").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingServer ? "Server updated" : "Server created");
    setShowServerForm(false);
    void load();
  }

  async function deleteServer(id: string, name: string) {
    if (!confirm(`Delete server "${name}" and all its channels/messages?`)) return;
    const { error } = await supabase.from("servers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Server deleted"); setActiveServer(null); void load(); }
  }

  async function addChannel() {
    if (!activeServer || !channelForm.name.trim()) return;
    const maxPos = channels.reduce((m, c) => Math.max(m, c.position), -1);
    const { error } = await supabase.from("channels").insert({
      server_id: activeServer.id,
      name: channelForm.name.trim().toLowerCase().replace(/\s+/g, "-"),
      type: channelForm.type,
      position: maxPos + 1,
    });
    if (error) toast.error(error.message);
    else { toast.success("Channel added"); setChannelForm({ name: "", type: "text" }); setShowChannelForm(false); void loadChannels(activeServer.id); }
  }

  async function deleteChannel(id: string, name: string) {
    if (!confirm(`Delete #${name}?`)) return;
    const { error } = await supabase.from("channels").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Channel deleted"); if (activeServer) void loadChannels(activeServer.id); }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Servers</h1>
          <p className="text-muted-foreground text-sm mt-1">{servers.length} servers</p>
        </div>
        <button onClick={() => { setEditingServer(null); setServerForm({ name: "", slug: "", kind: "global", description: "", college_id: "" }); setShowServerForm(true); }}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90">
          <Plus className="h-4 w-4" /> New Server
        </button>
      </div>

      {showServerForm && (
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingServer ? "Edit Server" : "New Server"}</h2>
            <button onClick={() => setShowServerForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><div className="text-xs text-muted-foreground mb-1.5">Name</div>
              <input value={serverForm.name} onChange={(e) => setServerForm((f) => ({ ...f, name: e.target.value }))} className="admin-input w-full" placeholder="Coding Community" /></div>
            <div><div className="text-xs text-muted-foreground mb-1.5">Slug</div>
              <input value={serverForm.slug} onChange={(e) => setServerForm((f) => ({ ...f, slug: e.target.value }))} className="admin-input w-full" placeholder="coding" /></div>
            <div><div className="text-xs text-muted-foreground mb-1.5">Kind</div>
              <select value={serverForm.kind} onChange={(e) => setServerForm((f) => ({ ...f, kind: e.target.value as any }))} className="admin-input w-full">
                <option value="global">Global</option>
                <option value="college">College</option>
              </select></div>
            {serverForm.kind === "college" && (
              <div><div className="text-xs text-muted-foreground mb-1.5">College</div>
                <select value={serverForm.college_id} onChange={(e) => setServerForm((f) => ({ ...f, college_id: e.target.value }))} className="admin-input w-full">
                  <option value="">Select college</option>
                  {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
            )}
          </div>
          <div><div className="text-xs text-muted-foreground mb-1.5">Description</div>
            <input value={serverForm.description} onChange={(e) => setServerForm((f) => ({ ...f, description: e.target.value }))} className="admin-input w-full" placeholder="What's this server about?" /></div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowServerForm(false)} className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-[hsl(var(--surface-2))]">Cancel</button>
            <button onClick={saveServer} disabled={saving} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
              {saving ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
              {editingServer ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Server list */}
        <div className="space-y-2">
          {loading ? <div className="text-sm text-muted-foreground animate-pulse">Loading…</div> : servers.map((s) => (
            <div key={s.id}
              onClick={() => selectServer(s)}
              className={`panel-2 p-4 cursor-pointer transition-all ${activeServer?.id === s.id ? "border-primary/50 bg-primary/5" : "hover:border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[hsl(var(--surface-3))] grid place-items-center text-xs font-bold">
                    {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.memberCount} members · {s.channelCount} channels</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.kind === "college" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"}`}>
                    {s.kind}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); setEditingServer(s); setServerForm({ name: s.name, slug: s.slug, kind: s.kind, description: s.description ?? "", college_id: s.college_id ?? "" }); setShowServerForm(true); }}
                    className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteServer(s.id, s.name); }}
                    className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Channel panel */}
        {activeServer && (
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{activeServer.name}</div>
                <div className="text-xs text-muted-foreground">Channels</div>
              </div>
              <button onClick={() => setShowChannelForm((v) => !v)}
                className="h-8 px-3 rounded-lg bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-primary/30">
                <Plus className="h-3.5 w-3.5" /> Add Channel
              </button>
            </div>

            {showChannelForm && (
              <div className="flex gap-2 p-3 rounded-lg bg-[hsl(var(--surface-2))]">
                <input value={channelForm.name} onChange={(e) => setChannelForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") addChannel(); }}
                  className="admin-input flex-1" placeholder="channel-name" />
                <select value={channelForm.type} onChange={(e) => setChannelForm((f) => ({ ...f, type: e.target.value as any }))}
                  className="admin-input w-24">
                  <option value="text">Text</option>
                  <option value="voice">Voice</option>
                </select>
                <button onClick={addChannel} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Add</button>
              </div>
            )}

            <div className="space-y-1">
              {channels.map((c) => (
                <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[hsl(var(--surface-2))] group">
                  {c.type === "text" ? <Hash className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-success" />}
                  <span className="flex-1 text-sm">{c.name}</span>
                  <button onClick={() => deleteChannel(c.id, c.name)}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded grid place-items-center text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {channels.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">No channels yet.</div>}
            </div>
          </div>
        )}
      </div>

      <style>{`.admin-input { width: 100%; height: 2.25rem; padding: 0 0.75rem; border-radius: 0.5rem; background: hsl(var(--input)); border: 1px solid hsl(var(--border)); color: hsl(var(--foreground)); font-size: 0.875rem; outline: none; } .admin-input:focus { border-color: hsl(var(--ring)); } select.admin-input { cursor: pointer; }`}</style>
    </div>
  );
}
