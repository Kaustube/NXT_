import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { X } from "lucide-react";

type Profile = {
  user_id: string;
  display_name: string;
  username: string;
  email: string;
  roll_number: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  college_id: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      const prof = data as Profile | null;
      setP(prof);
      if (prof) {
        setBio(prof.bio ?? "");
        setSkills(prof.skills ?? []);
        setInterests(prof.interests ?? []);
        if (prof.college_id) {
          const { data: c } = await supabase.from("colleges").select("name").eq("id", prof.college_id).maybeSingle();
          setCollegeName(c?.name ?? null);
        }
      }
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ bio, skills, interests }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      setEditing(false);
      setP((prev) => (prev ? { ...prev, bio, skills, interests } : prev));
    }
  }

  function addSkill() {
    const v = skillInput.trim();
    if (!v) return;
    setSkills([...skills, v]);
    setSkillInput("");
  }
  function addInterest() {
    const v = interestInput.trim();
    if (!v) return;
    setInterests([...interests, v]);
    setInterestInput("");
  }

  if (!p) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="panel p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[hsl(var(--surface-3))] grid place-items-center text-2xl">{p.display_name[0]}</div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-semibold">{p.display_name}</div>
            <div className="text-sm text-muted-foreground">@{p.username} · {p.email}</div>
            <div className="mt-1 flex items-center gap-2">
              {collegeName && <span className="chip">{collegeName}</span>}
              {p.roll_number && <span className="chip">{p.roll_number}</span>}
            </div>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="h-9 px-3 rounded-md border border-border text-sm"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Bio</div>
          {editing ? (
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full min-h-[100px] px-3 py-2 rounded-md bg-[hsl(var(--input))] border border-border text-sm" />
          ) : (
            <div className="text-sm text-foreground/90 whitespace-pre-wrap">{p.bio ?? "—"}</div>
          )}
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-6">
          <TagSection
            label="Skills"
            tags={skills}
            editing={editing}
            value={skillInput}
            onChange={setSkillInput}
            onAdd={addSkill}
            onRemove={(t) => setSkills(skills.filter((x) => x !== t))}
          />
          <TagSection
            label="Interests"
            tags={interests}
            editing={editing}
            value={interestInput}
            onChange={setInterestInput}
            onAdd={addInterest}
            onRemove={(t) => setInterests(interests.filter((x) => x !== t))}
          />
        </div>

        {editing && (
          <div className="mt-6 flex justify-end">
            <button onClick={save} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TagSection({
  label, tags, editing, value, onChange, onAdd, onRemove,
}: {
  label: string;
  tags: string[];
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (t: string) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="chip">
            {t}
            {editing && (
              <button onClick={() => onRemove(t)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {tags.length === 0 && !editing && <span className="text-sm text-muted-foreground">—</span>}
      </div>
      {editing && (
        <div className="mt-2 flex gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAdd();
              }
            }}
            placeholder={`Add ${label.toLowerCase().slice(0, -1)}`}
            className="flex-1 h-8 px-2 rounded-md bg-[hsl(var(--input))] border border-border text-sm"
          />
          <button onClick={onAdd} className="h-8 px-3 rounded-md border border-border text-sm">Add</button>
        </div>
      )}
    </div>
  );
}
