import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X, Camera, Edit3, GraduationCap, Flame, Trophy, Users,
  MessageSquare, Plus, Check, Hash, Briefcase, Star,

import { format } from "date-fns";

type Profile = { user_id: string; display_name: string; username: string; email: string; roll_number: string | null; bio: string | null; skills: string[]; interests: string[]; social_links: Array<{ platform: string; url: string; username: string }>; college_id: string | null; avatar_url: string | null; profile_visibility: "public" | "private"; };
type Streak = { current_streak: number; longest_streak: number; total_days_active: number; last_active_date: string | null; };
type Stats = { connections: number; messages: number; events: number; submissions: number; };

export default function ProfilePage() {
  const { user, profile: ctxProfile, refreshProfile, updateProfileState } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [stats, setStats] = useState<Stats>({ connections: 0, messages: 0, events: 0, submissions: 0 });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">("public");
  const [username, setUsername] = useState("");
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string; username: string }>>([]);
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
      setCollegeName(ctxProfile.college_name);
      setSocialLinks(ctxProfile.social_links ?? []);
    }
  }, [ctxProfile]);

  useEffect(() => {
    if (!user) return;
    void loadStats();
  }, [user]);

  async function loadStats() {
    if (!user) return;
    const [ { data: streakData }, conn, msg, ev, sub ] = await Promise.all([
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("connections").select("*", { count: "exact", head: true }).or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).eq("status", "accepted"),
      supabase.from("channel_messages").select("*", { count: "exact", head: true }).eq("author_id", user.id),
      supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("challenge_submissions").select("*", { count: "exact", head: true }).eq("user_id", user.id).catch(() => ({ count: 0 })),
    ]);
    setStreak(streakData as Streak | null);
    setStats({ connections: conn.count ?? 0, messages: msg.count ?? 0, events: ev.count ?? 0, submissions: (sub as any).count ?? 0 });
  }

  async function save() {
    if (!user) return;
    const newUsername = username.trim().toLowerCase();
    const { error } = await supabase.from("profiles").update({ 
      bio, skills, interests, display_name: displayName, profile_visibility: profileVisibility, username: newUsername,
      social_links: socialLinks
    }).eq("user_id", user.id);
    
    if (error) toast.error(error.message);
    else {
      updateProfileState({ display_name: displayName, username: newUsername, bio, skills, interests, social_links: socialLinks });
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
      updateProfileState({ avatar_url: url });
      toast.success("Avatar updated!");
      void refreshProfile();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  if (!p) return <div className="p-10 text-center animate-pulse">Loading profile…</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="panel overflow-hidden">
        <div className="h-32 md:h-44 bg-gradient-to-br from-primary/30 to-transparent" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-6">
            <div className="relative group">
              <div className="h-28 w-28 rounded-2xl border-4 border-background bg-[hsl(var(--surface-3))] overflow-hidden shadow-2xl">
                {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-4xl font-bold">{p.display_name[0]}</div>}
              </div>
              <button onClick={() => fileRef.current?.click()} className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                const next = profileVisibility === "public" ? "private" : "public";
                setProfileVisibility(next);
                updateProfileState({ profile_visibility: next });
                await supabase.from("profiles").update({ profile_visibility: next }).eq("user_id", user!.id);
                toast.success(`Profile is now ${next}`);
              }} className="h-10 px-4 rounded-xl border border-border text-xs font-bold flex items-center gap-2 hover:bg-[hsl(var(--surface-2))] transition-colors">
                {profileVisibility === "private" ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                {profileVisibility === "private" ? "Private" : "Public"}
              </button>
              {editing ? <button onClick={save} className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/20">Save Profile</button> : <button onClick={() => setEditing(true)} className="h-10 px-6 rounded-xl border border-border font-bold hover:bg-[hsl(var(--surface-2))] transition-colors">Edit Profile</button>}
            </div>
          </div>

          <div className="space-y-1">
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Display Name</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full text-2xl font-bold bg-[hsl(var(--surface-2))] rounded-xl px-4 py-2 border-none outline-none focus:ring-2 ring-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Username</label>
                  <div className="flex items-center bg-[hsl(var(--surface-2))] rounded-xl px-4 py-2 ring-primary/50 focus-within:ring-2">
                    <span className="text-muted-foreground mr-1">@</span>
                    <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="w-full bg-transparent border-none outline-none text-sm font-medium" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">{p.display_name}</h1>
                <div className="text-sm font-medium text-primary">@{p.username}</div>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {collegeName && <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {collegeName}</span>}
            {p.roll_number && <span className="flex items-center gap-1.5"><Hash className="h-4 w-4" /> {p.roll_number}</span>}
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {format(new Date(), "MMM yyyy")}</span>
          </div>

          <div className="mt-6">
             <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block ml-1">About Me</label>
             <textarea 
               value={bio} 
               onChange={(e) => setBio(e.target.value)} 
               className={`w-full min-h-[120px] rounded-2xl p-4 text-sm leading-relaxed transition-all ${editing ? "bg-[hsl(var(--surface-2))] border-none outline-none focus:ring-2 ring-primary/50" : "bg-transparent p-0 resize-none"}`} 
               placeholder="Tell the campus about yourself…"
               readOnly={!editing} 
             />
          </div>

          <div className="mt-8 border-t border-border/50 pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Connect</label>
              {editing && (
                <button 
                  onClick={() => setSocialLinks([...socialLinks, { platform: "website", url: "", username: "" }])}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Link
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                {socialLinks.map((link, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select 
                      value={link.platform} 
                      onChange={(e) => {
                        const next = [...socialLinks];
                        next[i].platform = e.target.value;
                        setSocialLinks(next);
                      }}
                      className="h-9 px-2 rounded-xl bg-[hsl(var(--surface-2))] border-none text-xs outline-none focus:ring-2 ring-primary/50"
                    >
                      <option value="linkedin">LinkedIn</option>
                      <option value="github">GitHub</option>
                      <option value="twitter">X (Twitter)</option>
                      <option value="spotify">Spotify</option>
                      <option value="steam">Steam</option>
                      <option value="discord">Discord</option>
                      <option value="website">Website</option>
                    </select>
                    <input 
                      placeholder="Username or URL"
                      value={link.username || link.url}
                      onChange={(e) => {
                        const next = [...socialLinks];
                        const val = e.target.value;
                        next[i].username = val;
                        next[i].url = val.startsWith("http") ? val : `https://${link.platform}.com/${val}`;
                        setSocialLinks(next);
                      }}
                      className="flex-1 h-9 px-3 rounded-xl bg-[hsl(var(--surface-2))] border-none text-xs outline-none focus:ring-2 ring-primary/50"
                    />
                    <button 
                      onClick={() => setSocialLinks(socialLinks.filter((_, idx) => idx !== i))}
                      className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive grid place-items-center hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {socialLinks.length === 0 ? (
                  <span className="text-sm text-muted-foreground italic">No social links added yet.</span>
                ) : (
                  socialLinks.map((link, i) => (
                    <a 
                      key={i} 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--surface-2))] border border-transparent hover:border-primary/30 transition-all hover:scale-105 group"
                    >
                      <SocialIcon platform={link.platform} />
                      <span className="text-xs font-bold">{link.username || "Link"}</span>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Connections" value={stats.connections} color="text-cyan-400" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Messages" value={stats.messages} color="text-emerald-400" icon={<MessageSquare className="h-5 w-5" />} />
        <StatCard label="Events" value={stats.events} color="text-orange-400" icon={<Trophy className="h-5 w-5" />} />
        <StatCard label="Challenges" value={stats.submissions} color="text-purple-400" icon={<Briefcase className="h-5 w-5" />} />
      </div>

      <div className="panel p-6">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
          <h2 className="text-lg font-bold">Activity Streak</h2>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-4xl font-black text-orange-500">{streak?.current_streak ?? 0}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Days Streak</div>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="space-y-1">
            <div className="text-4xl font-black text-primary">{streak?.longest_streak ?? 0}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Personal Best</div>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="space-y-1">
            <div className="text-4xl font-black">{streak?.total_days_active ?? 0}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Active</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="panel p-5 flex items-center gap-4 hover:scale-105 transition-transform cursor-default">
      <div className={`h-12 w-12 rounded-2xl bg-[hsl(var(--surface-2))] grid place-items-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black leading-none">{value}</div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
      </div>
    </div>
  );
}

function SocialIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "linkedin": return <Linkedin className="h-4 w-4 text-blue-400" />;
    case "github": return <Github className="h-4 w-4" />;
    case "twitter": return <Twitter className="h-4 w-4 text-sky-400" />;
    case "spotify": return <Music className="h-4 w-4 text-emerald-400" />;
    case "steam": return <Monitor className="h-4 w-4 text-blue-500" />;
    case "discord": return <MessageCircle className="h-4 w-4 text-indigo-400" />;
    default: return <Globe className="h-4 w-4 text-muted-foreground" />;
  }
}
