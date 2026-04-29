import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  Camera,
  Edit3,
  GraduationCap,
  Flame,
  Trophy,
  Users,
  MessageSquare,
  Plus,
  Check,
  Hash,
  Briefcase,
  Star,
  Calendar,
  Globe,
  Lock,
} from "lucide-react";
import { format } from "date-fns";

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
  profile_visibility: "public" | "private";
};

type Streak = {
  current_streak: number;
  longest_streak: number;
  total_days_active: number;
  last_active_date: string | null;
};

type Stats = {
  connections: number;
  messages: number;
  events: number;
  submissions: number;
};

export default function ProfilePage() {
  const { user, profile: ctxProfile, refreshProfile } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [stats, setStats] = useState<Stats>({ connections: 0, messages: 0, events: 0, submissions: 0 });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">("public");
  const fileRef = useRef<HTMLInputElement>(null);

  // Seed local state from context profile immediately (no flash)
  useEffect(() => {
    if (ctxProfile && !p) {
      setP(ctxProfile as any);
      setBio(ctxProfile.bio ?? "");
      setDisplayName(ctxProfile.display_name);
      setSkills(ctxProfile.skills ?? []);
      setInterests(ctxProfile.interests ?? []);
      setAvatarUrl(ctxProfile.avatar_url);
      setProfileVisibility(ctxProfile.profile_visibility ?? "public");
      setCollegeName(ctxProfile.college_name);
    }
  }, [ctxProfile]);

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;

    // Run queries with individual error handling so one failure doesn't break everything
    const [
      { data: prof },
      { data: streakData },
      connResult,
      msgResult,
      evResult,
      subResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("connections").select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq("status", "accepted"),
      supabase.from("channel_messages").select("*", { count: "exact", head: true }).eq("author_id", user.id),
      supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      // challenge_submissions may not exist yet — catch gracefully
      supabase.from("challenge_submissions").select("*", { count: "exact", head: true }).eq("user_id", user.id)
        .then(r => r)
        .catch(() => ({ count: 0 })),
    ]);

    const profile = prof as Profile | null;
    setP(profile);
    if (profile) {
      setBio(profile.bio ?? "");
      setDisplayName(profile.display_name);
      setSkills(profile.skills ?? []);
      setInterests(profile.interests ?? []);
      setAvatarUrl(profile.avatar_url);
      setProfileVisibility(profile.profile_visibility ?? "public");
      if (profile.college_id) {
        const { data: c } = await supabase.from("colleges").select("name").eq("id", profile.college_id).maybeSingle();
        setCollegeName(c?.name ?? null);
      }
    }
    setStreak(streakData as Streak | null);
    setStats({
      connections: connResult.count ?? 0,
      messages: msgResult.count ?? 0,
      events: evResult.count ?? 0,
      submissions: (subResult as any).count ?? 0,
    });

    // Update streak on profile visit
    await updateStreak();
  }

  async function updateStreak() {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: existing } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_active_date: today,
        total_days_active: 1,
      });
    } else {
      const last = existing.last_active_date;
      if (last === today) return; // already counted today
      const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
      const newStreak = last === yesterday ? existing.current_streak + 1 : 1;
      const longest = Math.max(newStreak, existing.longest_streak);
      await supabase.from("user_streaks").update({
        current_streak: newStreak,
        longest_streak: longest,
        last_active_date: today,
        total_days_active: existing.total_days_active + 1,
      }).eq("user_id", user.id);
    }
  }

  async function save() {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ bio, skills, interests, display_name: displayName, profile_visibility: profileVisibility })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      setEditing(false);
      setP((prev) => prev ? { ...prev, bio, skills, interests, display_name: displayName } : prev);
      void refreshProfile(); // update context so sidebar updates immediately
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      setAvatarUrl(url);
      setP((prev) => prev ? { ...prev, avatar_url: url } : prev);
      toast.success("Avatar updated!");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  function addSkill() {
    const v = skillInput.trim();
    if (!v || skills.includes(v)) return;
    setSkills([...skills, v]);
    setSkillInput("");
  }
  function addInterest() {
    const v = interestInput.trim();
    if (!v || interests.includes(v)) return;
    setInterests([...interests, v]);
    setInterestInput("");
  }

  if (!p) return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-sm text-muted-foreground animate-pulse">Loading profile…</div>
    </div>
  );

  const initials = p.display_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5 animate-in fade-in duration-500">

      {/* Cover + Avatar card */}
      <div className="panel overflow-hidden">
        {/* Cover gradient */}
        <div className="h-32 md:h-44 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.3),transparent_60%)]" />
        </div>

        <div className="px-5 pb-5">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl border-4 border-background bg-[hsl(var(--surface-3))] overflow-hidden shadow-xl">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={p.display_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-3xl font-bold text-foreground/60">
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {avatarUploading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </div>

            <div className="flex gap-2 mt-2 flex-wrap">
              {/* Privacy toggle */}
              <button
                onClick={async () => {
                  const next = profileVisibility === "public" ? "private" : "public";
                  setProfileVisibility(next);
                  if (user) {
                    await supabase.from("profiles").update({ profile_visibility: next }).eq("user_id", user.id);
                    toast.success(next === "private" ? "Profile set to private" : "Profile set to public");
                  }
                }}
                className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  profileVisibility === "private"
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                    : "border-border text-muted-foreground hover:bg-[hsl(var(--surface-2))]"
                }`}
              >
                {profileVisibility === "private" ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {profileVisibility === "private" ? "Private" : "Public"}
              </button>
              {editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-[hsl(var(--surface-2))] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    <Check className="h-4 w-4" /> Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="h-9 px-4 rounded-lg border border-border text-sm font-medium flex items-center gap-1.5 hover:bg-[hsl(var(--surface-2))] transition-colors"
                >
                  <Edit3 className="h-4 w-4" /> Edit profile
                </button>
              )}
            </div>
          </div>

          {/* Name + meta */}
          {editing ? (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="text-2xl font-bold bg-transparent border-b border-primary outline-none w-full mb-1"
            />
          ) : (
            <h1 className="text-2xl font-bold">{p.display_name}</h1>
          )}
          <div className="text-sm text-muted-foreground">@{p.username}</div>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
            {collegeName && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                {collegeName}
              </span>
            )}
            {p.roll_number && (
              <span className="flex items-center gap-1.5">
                <Hash className="h-4 w-4" />
                {p.roll_number}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Joined {format(new Date(2026, 3, 1), "MMM yyyy")}
            </span>
          </div>

          {/* Bio */}
          <div className="mt-4">
            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself…"
                className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-[hsl(var(--input))] border border-border text-sm resize-none outline-none focus:border-ring"
              />
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {p.bio || <span className="text-muted-foreground italic">No bio yet. Click Edit to add one.</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Connections" value={stats.connections} color="text-blue-400" />
        <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Messages" value={stats.messages} color="text-green-400" />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Events" value={stats.events} color="text-yellow-400" />
        <StatCard icon={<Briefcase className="h-4 w-4" />} label="Challenges" value={stats.submissions} color="text-purple-400" />
      </div>

      {/* Streak card */}
      <div className="panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-400" />
          <h2 className="font-semibold">Daily Streak</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{streak?.current_streak ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Current streak</div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-3xl font-bold text-primary">{streak?.longest_streak ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Longest streak</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{streak?.total_days_active ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Total days active</div>
          </div>
        </div>
        {/* Streak flame row */}
        <div className="mt-4 flex items-center gap-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const active = i < Math.min(streak?.current_streak ?? 0, 7);
            return (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-all ${active ? "bg-orange-400 shadow-[0_0_6px_theme(colors.orange.400)]" : "bg-[hsl(var(--surface-3))]"}`}
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {streak?.current_streak
            ? `🔥 ${streak.current_streak} day streak — keep it up!`
            : "Visit daily to build your streak!"}
        </p>
      </div>

      {/* Skills + Interests */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Skills</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((t) => (
              <span key={t} className="chip">
                {t}
                {editing && (
                  <button onClick={() => setSkills(skills.filter((x) => x !== t))} className="text-muted-foreground hover:text-destructive ml-1">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {skills.length === 0 && !editing && <span className="text-sm text-muted-foreground">No skills added yet.</span>}
          </div>
          {editing && (
            <div className="mt-3 flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Add a skill…"
                className="flex-1 h-8 px-2 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none"
              />
              <button onClick={addSkill} className="h-8 w-8 rounded-md border border-border grid place-items-center hover:bg-[hsl(var(--surface-2))]">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Interests</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((t) => (
              <span key={t} className="chip">
                {t}
                {editing && (
                  <button onClick={() => setInterests(interests.filter((x) => x !== t))} className="text-muted-foreground hover:text-destructive ml-1">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {interests.length === 0 && !editing && <span className="text-sm text-muted-foreground">No interests added yet.</span>}
          </div>
          {editing && (
            <div className="mt-3 flex gap-2">
              <input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(); } }}
                placeholder="Add an interest…"
                className="flex-1 h-8 px-2 rounded-md bg-[hsl(var(--input))] border border-border text-sm outline-none"
              />
              <button onClick={addInterest} className="h-8 w-8 rounded-md border border-border grid place-items-center hover:bg-[hsl(var(--surface-2))]">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account info */}
      <div className="panel p-5">
        <h2 className="font-semibold text-sm mb-3">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Email</span>
            <span>{p.email}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Username</span>
            <span>@{p.username}</span>
          </div>
          {p.roll_number && (
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Roll number</span>
              <span>{p.roll_number}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="panel p-4 flex items-center gap-3">
      <div className={`${color} opacity-80`}>{icon}</div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
