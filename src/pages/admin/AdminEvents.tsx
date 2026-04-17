import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Check, X, CalendarDays } from "lucide-react";
import { format } from "date-fns";

type Event = {
  id: string;
  title: string;
  description: string;
  kind: "hackathon" | "codeathon" | "challenge";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  cover_url: string | null;
  created_at: string;
  registrationCount?: number;
};

const KIND_COLOR = {
  hackathon: "bg-purple-400/10 text-purple-400",
  codeathon: "bg-blue-400/10 text-blue-400",
  challenge: "bg-orange-400/10 text-orange-400",
};

const EMPTY = { title: "", description: "", kind: "hackathon" as Event["kind"], starts_at: "", ends_at: "", location: "", cover_url: "" };

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: ev }, { data: regs }] = await Promise.all([
      supabase.from("events").select("*").order("starts_at", { ascending: false }),
      supabase.from("event_registrations").select("event_id"),
    ]);
    const regCounts: Record<string, number> = {};
    (regs ?? []).forEach((r: any) => { regCounts[r.event_id] = (regCounts[r.event_id] ?? 0) + 1; });
    setEvents((ev ?? []).map((e: any) => ({ ...e, registrationCount: regCounts[e.id] ?? 0 })));
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(e: Event) {
    setEditing(e);
    setForm({
      title: e.title, description: e.description, kind: e.kind,
      starts_at: e.starts_at.slice(0, 16),
      ends_at: e.ends_at?.slice(0, 16) ?? "",
      location: e.location ?? "", cover_url: e.cover_url ?? "",
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim() || !form.description.trim() || !form.starts_at) {
      toast.error("Title, description and start date are required");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      kind: form.kind,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      location: form.location.trim() || null,
      cover_url: form.cover_url.trim() || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("events").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("events").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Event updated" : "Event created");
    setShowForm(false);
    void load();
  }

  async function deleteEvent(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); void load(); }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">{events.length} events</p>
        </div>
        <button onClick={openNew}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90">
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      {showForm && (
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editing ? "Edit Event" : "New Event"}</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1.5">Title *</div>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="admin-input w-full" placeholder="Inter-College Hackathon" />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1.5">Description *</div>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="admin-input w-full min-h-[80px] resize-none" placeholder="Event details…" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Kind</div>
              <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as any }))} className="admin-input w-full">
                <option value="hackathon">Hackathon</option>
                <option value="codeathon">Codeathon</option>
                <option value="challenge">Challenge</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Location</div>
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="admin-input w-full" placeholder="Online / Room 101" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Starts at *</div>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} className="admin-input w-full" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Ends at (optional)</div>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} className="admin-input w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-[hsl(var(--surface-2))]">Cancel</button>
            <button onClick={save} disabled={saving} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
              {saving ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
              {editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="panel-2 p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-[hsl(var(--surface-3))] grid place-items-center shrink-0">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{e.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${KIND_COLOR[e.kind]}`}>{e.kind}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(e.starts_at), "MMM d, yyyy h:mm a")}
                  {e.location && ` · ${e.location}`}
                  {` · ${e.registrationCount} registered`}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(e)} className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => deleteEvent(e.id, e.title)} className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && <div className="panel p-10 text-center text-sm text-muted-foreground">No events yet.</div>}
        </div>
      )}

      <style>{`.admin-input { width: 100%; height: 2.25rem; padding: 0 0.75rem; border-radius: 0.5rem; background: hsl(var(--input)); border: 1px solid hsl(var(--border)); color: hsl(var(--foreground)); font-size: 0.875rem; outline: none; } .admin-input:focus { border-color: hsl(var(--ring)); } textarea.admin-input { height: auto; padding: 0.5rem 0.75rem; } select.admin-input { cursor: pointer; }`}</style>
    </div>
  );
}
