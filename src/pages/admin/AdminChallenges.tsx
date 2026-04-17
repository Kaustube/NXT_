import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Check, X, Code2 } from "lucide-react";
import { format } from "date-fns";

type Challenge = {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  examples: any[];
  constraints: string | null;
  active_date: string;
  created_at: string;
};

const DIFF_COLOR = {
  easy: "text-emerald-400 bg-emerald-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  hard: "text-red-400 bg-red-400/10",
};

const EMPTY: Omit<Challenge, "id" | "created_at"> = {
  title: "", slug: "", description: "", difficulty: "medium",
  tags: [], examples: [], constraints: "", active_date: format(new Date(), "yyyy-MM-dd"),
};

export default function AdminChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("coding_challenges").select("*").order("active_date", { ascending: false });
    setChallenges((data as Challenge[]) ?? []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, active_date: format(new Date(), "yyyy-MM-dd") });
    setTagInput("");
    setShowForm(true);
  }

  function openEdit(c: Challenge) {
    setEditing(c);
    setForm({
      title: c.title, slug: c.slug, description: c.description,
      difficulty: c.difficulty, tags: [...c.tags],
      examples: c.examples, constraints: c.constraints ?? "",
      active_date: c.active_date,
    });
    setTagInput("");
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim()) {
      toast.error("Title, slug and description are required");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      description: form.description.trim(),
      difficulty: form.difficulty,
      tags: form.tags,
      examples: form.examples,
      constraints: form.constraints?.trim() || null,
      active_date: form.active_date,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("coding_challenges").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("coding_challenges").insert(payload));
    }

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Challenge updated" : "Challenge created");
    setShowForm(false);
    void load();
  }

  async function deleteChallenge(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    const { error } = await supabase.from("coding_challenges").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); void load(); }
  }

  function addTag() {
    const v = tagInput.trim().toLowerCase();
    if (!v || form.tags.includes(v)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    setTagInput("");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coding Challenges</h1>
          <p className="text-muted-foreground text-sm mt-1">{challenges.length} challenges</p>
        </div>
        <button
          onClick={openNew}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Challenge
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">{editing ? "Edit Challenge" : "New Challenge"}</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Title">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="admin-input" placeholder="Two Sum" />
            </FormField>
            <FormField label="Slug">
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="admin-input" placeholder="two-sum" />
            </FormField>
          </div>

          <FormField label="Description">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="admin-input min-h-[100px] resize-none" placeholder="Problem statement…" />
          </FormField>

          <div className="grid md:grid-cols-3 gap-4">
            <FormField label="Difficulty">
              <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as any }))}
                className="admin-input">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </FormField>
            <FormField label="Active Date">
              <input type="date" value={form.active_date} onChange={(e) => setForm((f) => ({ ...f, active_date: e.target.value }))}
                className="admin-input" />
            </FormField>
            <FormField label="Constraints (| separated)">
              <input value={form.constraints ?? ""} onChange={(e) => setForm((f) => ({ ...f, constraints: e.target.value }))}
                className="admin-input" placeholder="1 <= n <= 10^4 | -10^9 <= nums[i]" />
            </FormField>
          </div>

          <FormField label="Tags">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map((t) => (
                <span key={t} className="chip text-xs">
                  {t}
                  <button onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}
                    className="ml-1 text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                className="admin-input flex-1" placeholder="array, hash-map…" />
              <button onClick={addTag} className="h-9 px-3 rounded-lg border border-border text-sm hover:bg-[hsl(var(--surface-2))]">Add</button>
            </div>
          </FormField>

          <FormField label="Examples (JSON array)">
            <textarea
              value={JSON.stringify(form.examples, null, 2)}
              onChange={(e) => {
                try { setForm((f) => ({ ...f, examples: JSON.parse(e.target.value) })); } catch {}
              }}
              className="admin-input min-h-[80px] resize-none font-mono text-xs"
              placeholder='[{"input": "nums = [2,7]", "output": "[0,1]"}]'
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)}
              className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-[hsl(var(--surface-2))]">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
              {saving ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
              {editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : (
        <div className="space-y-2">
          {challenges.map((c) => (
            <div key={c.id} className="panel-2 p-4 flex items-center gap-4">
              <div className="h-9 w-9 rounded-lg bg-[hsl(var(--surface-3))] grid place-items-center shrink-0">
                <Code2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{c.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${DIFF_COLOR[c.difficulty]}`}>
                    {c.difficulty}
                  </span>
                  {c.active_date === format(new Date(), "yyyy-MM-dd") && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary">TODAY</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>{format(new Date(c.active_date), "MMM d, yyyy")}</span>
                  <span>·</span>
                  {c.tags.slice(0, 3).map((t) => <span key={t}>{t}</span>)}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(c)}
                  className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => deleteChallenge(c.id, c.title)}
                  className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {challenges.length === 0 && (
            <div className="panel p-10 text-center text-sm text-muted-foreground">
              No challenges yet. Click "New Challenge" to add one.
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
        textarea.admin-input { height: auto; padding: 0.5rem 0.75rem; }
        select.admin-input { cursor: pointer; }
      `}</style>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}
