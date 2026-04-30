import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X, Camera, Edit3, GraduationCap, Flame, Trophy, Users,
  MessageSquare, Plus, Check, Hash, Briefcase, Star,
  Calendar, Globe, Lock, Link2, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

type SocialPlatform = { id: string; label: string; placeholder: string; prefix: string; color: string; emoji: string; };

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: "instagram",  label: "Instagram",  placeholder: "username",           prefix: "https://instagram.com/",  color: "text-pink-400",   emoji: "📸" },
  { id: "twitter",    label: "X (Twitter)",placeholder: "username",           prefix: "https://x.com/",          color: "text-sky-400",    emoji: "𝕏" },
  { id: "linkedin",   label: "LinkedIn",   placeholder: "username",           prefix: "https://linkedin.com/in/",color: "text-blue-500",   emoji: "💼" },
  { id: "github",     label: "GitHub",     placeholder: "username",           prefix: "https://github.com/",     color: "text-foreground", emoji: "🐙" },
  { id: "discord",    label: "Discord",    placeholder: "username or tag",    prefix: "",                        color: "text-indigo-400", emoji: "🎮" },
  { id: "leetcode",   label: "LeetCode",   placeholder: "username",           prefix: "https://leetcode.com/",   color: "text-orange-400", emoji: "💻" },
  { id: "website",    label: "Website",    placeholder: "https://yoursite.com",prefix: "",                       color: "text-primary",    emoji: "🌐" },
];

type SocialLink = { platform: string; username: string; url: string };
type Profile = { user_id: string; display_name: string; username: string; email: string; roll_number: string | null; bio: string | null; skills: string[]; interests: string[]; college_id: string | null; avatar_url: string | null; profile_visibility: "public" | "private"; };
type Streak = { current_streak: number; longest_streak: number; total_days_active: number; last_active_date: string | null; };
type Stats = { connections: number; messages: number; events: number; submissions: number; };

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
  const [username, setUsername] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [showSocialPicker, setShowSocialPicker] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [socialInput, setSocialInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ctxProfile && !p) {
      setP(ctxProfile as any);
      setBio(ctxProfile.bio ?? "");
      setDisplayName(ctxProfile.display_name);
      setUsername(ctxProfile.username ?? "");
      setSkills(ctxProfile.skills ?? []);
      setInterests(ctxProfile.interests ?? []);
      setAvatarUrl(ctxProfile.avatar_url);
      setProfileVisibility(ctxProfile.profile_visibility ?? "public");
      setSocialLinks((ctxProfile as any).social_links ?? []);
      setCollegeName(ctxProfile.college_name);
    }
  }, [ctxProfile]);

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;
    const [ { data: prof }, { data: streakData }, connResult, msgResult, evResult, subResult ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("connections").select("*", { count: "exact", head: true }).or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).eq("status", "accepted"),
      supabase.from("channel_messages").select("*", { count: "exact", head: true }).eq("author_id", user.id),
      supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("challenge_submissions").select("*", { count: "exact", head: true }).eq("user_id", user.id).catch(() => ({ count: 0 })),
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
  }

  async function save() {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ bio, skills, interests, display_name: displayName, profile_visibility: profileVisibility, social_links: socialLinks, username: username.trim().toLowerCase() })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      setEditing(false);
      void refreshProfile();
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      setAvatarUrl(url);
      void refreshProfile();
      toast.success("Avatar updated!");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="panel overflow-hidden">
        <div className="h-32 md:h-44 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent relative" />
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl border-4 border-background bg-[hsl(var(--surface-3))] overflow-hidden shadow-xl">
                {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-3xl font-bold">{p.display_name[0]}</div>}
              </div>
              <button onClick={() => fileRef.current?.click()} className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                const next = profileVisibility === "public" ? "private" : "public";
                setProfileVisibility(next);
                await supabase.from("profiles").update({ profile_visibility: next }).eq("user_id", user!.id);
                void refreshProfile();
                toast.success(`Profile set to ${next}`);
              }} className="h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors">
                {profileVisibility === "private" ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {profileVisibility === "private" ? "Private" : "Public"}
              </button>
              {editing ? <button onClick={save} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-bold">Save</button> : <button onClick={() => setEditing(true)} className="h-9 px-4 rounded-lg border border-border">Edit</button>}
            </div>
          </div>
          {editing ? (
            <div className="space-y-3">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="text-2xl font-bold bg-transparent border-b border-primary w-full outline-none" />
              <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="text-sm bg-transparent border-b border-primary w-full outline-none" placeholder="username" />
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold">{p.display_name}</h1>
              <div className="text-sm text-muted-foreground">@{p.username}</div>
            </div>
          )}
          <div className="mt-4"><textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-[hsl(var(--input))] border rounded-lg p-3 text-sm outline-none" readOnly={!editing} /></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Connections" value={stats.connections} color="text-blue-400" />
        <StatCard label="Messages" value={stats.messages} color="text-green-400" />
        <StatCard label="Events" value={stats.events} color="text-yellow-400" />
        <StatCard label="Challenges" value={stats.submissions} color="text-purple-400" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="panel p-4 flex flex-col items-center">
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>;
}
