import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Check, X, GraduationCap, Globe } from "lucide-react";

type College = {
  id: string;
  name: string;
  short_code: string;
  email_domain: string;
  created_at: string;
  userCount?: number;
};

const EMPTY = { name: "", short_code: "", email_domain: "" };

export default function AdminColleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<College | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: cols }, { data: profiles }] = await Promise.all([
      supabase.from("colleges").select("*").order("name"),
      supabase.from("profiles").select("college_id"),
    ]);

    // Count users per college
    const counts: Record<string, number> = {};
    (profiles ?? []).forEach((p: any) => {
      if (p.college_id) counts[p.college_id] = (counts[p.college_id] ?? 0) + 1;
    });

    setColleges(
      (cols ?? []).map((c: any) => ({ ...c, userCount: counts[c.id] ?? 0 }))
    );
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(c: College) {
    setEditing(c);
    setForm({ name: c.name, short_code: c.short_code, email_domain: c.email_domain });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.short_code.trim() || !form.email_domain.trim()) {
      toast.error("All fields are required");
      return;
    }
    // Validate email domain format
    if (!form.email_domain.includes(".")) {
      toast.error("Email domain must be valid (e.g. bennett.edu.in)");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      short_code: form.short_code.trim().toUpperCase(),
      email_domain: form.email_domain.trim().toLowerCase(),
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("colleges").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("colleges").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "College updated" : "College added");
    setShowForm(false);
    setEditing(null);
    void load();
  }

  async function deleteCollege(c: College) {
    if (c.userCount && c.userCount > 0) {
      toast.error(`Cannot delete — ${c.userCount} users are registered with this college`);
      return;
    }
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("colleges").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success("College deleted"); void load(); }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Colleges</h1>
          <p className="text-muted-foreground text-sm mt-1">{colleges.length} colleges registered</p>
        </div>
        <button
          onClick={openNew}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add College
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editing ? "Edit College" : "Add College"}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1.5">College Name *</div>
              <input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="admin-input w-full"
                placeholder="e.g. Bennett University"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Short Code *</div>
              <input
                value={form.short_code}
                onChange={(e) => setForm(f => ({ ...f, short_code: e.target.value }))}
                className="admin-input w-full"
                placeholder="e.g. BU"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground mt-1">Shown in user profiles (auto-uppercased)</p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Email Domain *</div>
              <input
                value={form.email_domain}
                onChange={(e) => setForm(f => ({ ...f, email_domain: e.target.value }))}
                className="admin-input w-full"
                placeholder="e.g. bennett.edu.in"
              />
              <p className="text-xs text-muted-foreground mt-1">Students must register with this domain</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <strong className="text-foreground">After adding:</strong> A college server will need to be created manually in the Servers tab. Students with matching email domains will be able to select this college during registration.
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-[hsl(var(--surface-2))]"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {saving
                ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Check className="h-4 w-4" />}
              {editing ? "Update" : "Add College"}
            </button>
          </div>
        </div>
      )}

      {/* College list */}
      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : (
        <div className="space-y-2">
          {colleges.map((c) => (
            <div key={c.id} className="panel-2 p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0 font-bold text-sm">
                {c.short_code.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{c.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(var(--surface-3))] text-muted-foreground">
                    {c.short_code}
                  </span>
                  {c.id === "00000000-0000-0000-0000-000000000000" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400">
                      Special
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    @{c.email_domain}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {c.userCount} student{c.userCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {/* Don't allow editing/deleting the special "No College" entry */}
              {c.id !== "00000000-0000-0000-0000-000000000000" && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteCollege(c)}
                    className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title={c.userCount ? `${c.userCount} users — cannot delete` : "Delete"}
                    disabled={!!c.userCount}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {colleges.length === 0 && (
            <div className="panel p-10 text-center text-sm text-muted-foreground">
              No colleges yet. Add one above.
            </div>
          )}
        </div>
      )}

      <style>{`
        .admin-input {
          width: 100%; height: 2.25rem; padding: 0 0.75rem;
          border-radius: 0.5rem; background: hsl(var(--input));
          border: 1px solid hsl(var(--border)); color: hsl(var(--foreground));
          font-size: 0.875rem; outline: none;
        }
        .admin-input:focus { border-color: hsl(var(--ring)); }
      `}</style>
    </div>
  );
}
