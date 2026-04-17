import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Upload, Trash2, FileText, Download, Plus, X } from "lucide-react";
import { format } from "date-fns";

type Material = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  material_type: string;
  created_at: string;
  uploaded_by: string;
};

const COURSES = [
  { id: "CSET244", name: "Design & Analysis of Algorithms" },
  { id: "CSET210", name: "Design Thinking and Innovation" },
  { id: "CSET203", name: "Microprocessors and Computer Networks" },
  { id: "CSET209", name: "Operating System" },
];

const MATERIAL_TYPES = ["notes", "slides", "video", "assignment", "other"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminLMS() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeCourse, setActiveCourse] = useState("CSET244");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", material_type: "notes" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void load(); }, [activeCourse]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("course_materials")
      .select("*")
      .eq("course_id", activeCourse)
      .order("created_at", { ascending: false });
    setMaterials((data as Material[]) ?? []);
    setLoading(false);
  }

  async function upload() {
    if (!user || !selectedFile || !form.title.trim()) {
      toast.error("Title and file are required");
      return;
    }
    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${activeCourse}/${Date.now()}_${selectedFile.name}`;
      const { error: upErr } = await supabase.storage
        .from("lms-materials")
        .upload(path, selectedFile, { upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("lms-materials").getPublicUrl(path);

      const { error: dbErr } = await supabase.from("course_materials").insert({
        course_id: activeCourse,
        uploaded_by: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        file_url: urlData.publicUrl,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        file_type: selectedFile.type || `application/${ext}`,
        material_type: form.material_type,
      });
      if (dbErr) throw dbErr;

      toast.success("Material uploaded!");
      setShowForm(false);
      setSelectedFile(null);
      setForm({ title: "", description: "", material_type: "notes" });
      void load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteMaterial(m: Material) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    // Remove from storage
    const path = m.file_url.split("/lms-materials/")[1];
    if (path) await supabase.storage.from("lms-materials").remove([path]);
    const { error } = await supabase.from("course_materials").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); void load(); }
  }

  const TYPE_ICON: Record<string, string> = {
    notes: "📝", slides: "📊", video: "🎬", assignment: "📋", other: "📎",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LMS Materials</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload and manage course files.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90">
          <Upload className="h-4 w-4" /> Upload File
        </button>
      </div>

      {/* Course tabs */}
      <div className="flex gap-2 flex-wrap">
        {COURSES.map((c) => (
          <button key={c.id} onClick={() => setActiveCourse(c.id)}
            className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${activeCourse === c.id ? "bg-primary text-primary-foreground" : "border border-border hover:bg-[hsl(var(--surface-2))]"}`}>
            {c.id}
          </button>
        ))}
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Upload to {activeCourse}</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Title *</div>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="admin-input w-full" placeholder="Week 3 Lecture Notes" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Type</div>
              <select value={form.material_type} onChange={(e) => setForm((f) => ({ ...f, material_type: e.target.value }))}
                className="admin-input w-full">
                {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Description (optional)</div>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="admin-input w-full" placeholder="Brief description…" />
          </div>

          {/* File drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${selectedFile ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-[hsl(var(--surface-2))]"}`}
          >
            {selectedFile ? (
              <div>
                <div className="text-2xl mb-2">📄</div>
                <div className="font-medium text-sm">{selectedFile.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatBytes(selectedFile.size)}</div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="mt-2 text-xs text-destructive hover:underline">Remove</button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                <div className="text-sm font-medium">Click to select a file</div>
                <div className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, MP4, ZIP — up to 50MB</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.zip,.rar,.txt,.py,.js,.cpp,.java"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-[hsl(var(--surface-2))]">Cancel</button>
            <button onClick={upload} disabled={uploading || !selectedFile}
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
              {uploading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </button>
          </div>
        </div>
      )}

      {/* Materials list */}
      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : materials.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          No materials for {activeCourse} yet. Upload one above.
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <div key={m.id} className="panel-2 p-4 flex items-center gap-4">
              <div className="text-2xl shrink-0">{TYPE_ICON[m.material_type] ?? "📎"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{m.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="capitalize">{m.material_type}</span>
                  <span>·</span>
                  <span>{m.file_name}</span>
                  <span>·</span>
                  <span>{formatBytes(m.file_size)}</span>
                  <span>·</span>
                  <span>{format(new Date(m.created_at), "MMM d, yyyy")}</span>
                </div>
                {m.description && <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                  className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Download className="h-4 w-4" />
                </a>
                <button onClick={() => deleteMaterial(m)}
                  className="h-8 w-8 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`.admin-input { width: 100%; height: 2.25rem; padding: 0 0.75rem; border-radius: 0.5rem; background: hsl(var(--input)); border: 1px solid hsl(var(--border)); color: hsl(var(--foreground)); font-size: 0.875rem; outline: none; } .admin-input:focus { border-color: hsl(var(--ring)); } select.admin-input { cursor: pointer; }`}</style>
    </div>
  );
}
