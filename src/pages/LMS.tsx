import { useEffect, useState } from "react";
import {
  BookOpen, Clock, FileText, CheckCircle, Video, Code2, Flame, Trophy,
  ChevronRight, Play, BarChart3, Zap, GraduationCap, Lock, Calendar,
  TrendingUp, Award, Timer
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

const COLLEGE_COURSES: Record<string, Array<{ id: string; name: string; prof: string; time: string; progress: number; color: string; credits: number }>> = {
  BU: [
    { id: "CSET244", name: "Design & Analysis of Algorithms", prof: "Dr. Vijayant Pawar", time: "Mon, Wed 10:00 AM", progress: 65, color: "bg-blue-500", credits: 4 },
    { id: "CSET210", name: "Design Thinking and Innovation", prof: "Dr. Urvashi Sugandh", time: "Tue, Thu 2:00 PM", progress: 72, color: "bg-purple-500", credits: 2 },
    { id: "CSET203", name: "Microprocessors and Computer Networks", prof: "Mr. Kishan Yumnam", time: "Mon, Fri 4:00 PM", progress: 55, color: "bg-emerald-500", credits: 4 },
    { id: "CSET209", name: "Operating System", prof: "Dr. Akhil Kumar", time: "Wed, Fri 9:00 AM", progress: 48, color: "bg-orange-500", credits: 3 },
  ],
};

const COLLEGE_ASSIGNMENTS: Record<string, Array<{ title: string; course: string; due: string; status: string; type: string; grade?: string; priority: 'high' | 'medium' | 'low' }>> = {
  BU: [
    { title: "Project 1: Algorithm Analysis Report", course: "CSET244", due: "Tomorrow, 11:59 PM", status: "pending", type: "Project", priority: 'high' },
    { title: "Design Thinking Case Study", course: "CSET210", due: "Apr 20, 11:59 PM", status: "pending", type: "Assignment", priority: 'medium' },
    { title: "MCN Lab Assignment 3", course: "CSET203", due: "Apr 22, 11:59 PM", status: "submitted", type: "Homework", priority: 'low' },
    { title: "OS Concepts Quiz", course: "CSET209", due: "Apr 18, 9:00 AM", status: "graded", type: "Quiz", grade: "9.5/10", priority: 'medium' },
  ],
};

type Challenge = { id: string; title: string; slug: string; description: string; difficulty: "easy" | "medium" | "hard"; tags: string[]; examples: Array<{ input: string; output: string; explanation?: string }>; constraints: string | null; active_date: string; };
type Submission = { id: string; challenge_id: string; language: string; code: string; status: string; submitted_at: string; };

const DIFFICULTY_COLOR = {
  easy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  hard: "text-red-400 bg-red-400/10 border-red-400/20",
};

const STARTER_CODE: Record<string, string> = {
  python: "def solution():\n    # Write your solution here\n    pass\n",
  javascript: "function solution() {\n  // Write your solution here\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // Write your solution here\n  return 0;\n}\n",
};

export default function LMS() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"courses" | "assignments" | "challenges">("courses");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [collegeCode, setCollegeCode] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadChallenges();
    void loadStreak();
    void loadCollege();
  }, [user]);

  async function loadCollege() {
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("college_id").eq("user_id", user.id).maybeSingle();
    if ((prof as any)?.college_id) {
      const { data: col } = await supabase.from("colleges").select("short_code, name").eq("id", (prof as any).college_id).maybeSingle();
      setCollegeCode((col as any)?.short_code ?? "BU");
      setCollegeName((col as any)?.name ?? "Bennett University");
    }
  }

  const courses = COLLEGE_COURSES[collegeCode || "BU"];
  const assignments = COLLEGE_ASSIGNMENTS[collegeCode || "BU"];

  async function loadChallenges() {
    if (!user) return;
    const [{ data: ch }, { data: subs }] = await Promise.all([
      supabase.from("coding_challenges").select("*").order("active_date", { ascending: false }).limit(20),
      supabase.from("challenge_submissions").select("*").eq("user_id", user.id),
    ]);
    setChallenges((ch as Challenge[]) ?? []);
    const subMap: Record<string, Submission> = {};
    ((subs as Submission[]) ?? []).forEach((s) => (subMap[s.challenge_id] = s));
    setSubmissions(subMap);
  }

  async function loadStreak() {
    if (!user) return;
    const { data } = await supabase.from("user_streaks").select("current_streak").eq("user_id", user.id).maybeSingle();
    setStreak((data as any)?.current_streak ?? 0);
  }

  function openChallenge(c: Challenge) {
    setActiveChallenge(c);
    const existing = submissions[c.id];
    setCode(existing?.code ?? STARTER_CODE[language] ?? "");
    setLanguage(existing?.language ?? "python");
  }

  async function submitSolution() {
    if (!user || !activeChallenge || !code.trim()) return;
    setSubmitting(true);
    try {
      const existing = submissions[activeChallenge.id];
      if (existing) {
        await supabase.from("challenge_submissions").update({ code, language, status: "submitted", submitted_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("challenge_submissions").insert({ challenge_id: activeChallenge.id, user_id: user.id, language, code, status: "submitted" });
      }
      toast.success("Solution submitted! 🎉");
      await loadChallenges();
      setActiveChallenge(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  }

  const todayChallenge = challenges.find(c => c.active_date === format(new Date(), "yyyy-MM-dd"));
  const solvedCount = Object.values(submissions).filter(s => s.status === "submitted").length;

  if (activeChallenge) {
    return (
      <div className="flex h-screen overflow-hidden bg-[hsl(var(--surface-1))]">
        <div className="w-[40%] shrink-0 border-r border-border overflow-auto p-6 space-y-6">
          <button onClick={() => setActiveChallenge(null)} className="h-8 px-3 rounded-lg border border-border text-xs flex items-center gap-2 hover:bg-[hsl(var(--surface-2))] transition-all">← Exit Focus Mode</button>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${DIFFICULTY_COLOR[activeChallenge.difficulty]}`}>{activeChallenge.difficulty}</span>
              {submissions[activeChallenge.id] && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SOLVED</span>}
            </div>
            <h1 className="text-3xl font-black mb-4">{activeChallenge.title}</h1>
            <p className="text-sm text-foreground/70 leading-relaxed">{activeChallenge.description}</p>
          </div>
          {activeChallenge.examples.map((ex, i) => (
             <div key={i} className="panel p-4 bg-[hsl(var(--surface-2))] border-none">
                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Example {i+1}</div>
                <div className="text-xs font-mono space-y-1 text-primary">
                  <div>Input: {ex.input}</div>
                  <div>Output: {ex.output}</div>
                </div>
             </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-background">
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold border border-primary/20">{language}</button>
            </div>
            <button onClick={submitSolution} disabled={submitting} className="h-9 px-6 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20">Submit Solution</button>
          </div>
          <textarea value={code} onChange={e => setCode(e.target.value)} className="flex-1 p-8 bg-black/20 font-mono text-sm outline-none resize-none" spellCheck={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="panel p-5 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <TrendingUp className="h-5 w-5 text-blue-400 mb-3" />
            <div className="text-2xl font-black">3.8</div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Est. GPA</div>
          </div>
          <div className="panel p-5 bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
            <Flame className="h-5 w-5 text-orange-400 mb-3" />
            <div className="text-2xl font-black">{streak} Days</div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Study Streak</div>
          </div>
          <div className="panel p-5 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <Award className="h-5 w-5 text-emerald-400 mb-3" />
            <div className="text-2xl font-black">{solvedCount}</div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Challenges</div>
          </div>
          <div className="panel p-5 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <Timer className="h-5 w-5 text-purple-400 mb-3" />
            <div className="text-2xl font-black">2h 40m</div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Daily Average</div>
          </div>
        </div>

        <div className="flex gap-6 border-b border-border/50">
          {(["courses", "assignments", "challenges"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "courses" && (
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map(course => (
              <div key={course.id} className="panel p-6 group hover:border-primary/50 transition-all cursor-pointer bg-[hsl(var(--surface-1))]">
                <div className="flex justify-between items-start mb-6">
                  <div className={`h-14 w-14 rounded-2xl ${course.color} shadow-lg shadow-${course.color.split('-')[1]}-500/20 flex items-center justify-center text-white font-black text-xl`}>
                    {course.id.substring(0, 2)}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-muted-foreground uppercase">{course.id}</div>
                    <div className="text-sm font-black text-primary">{course.credits} Credits</div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{course.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {course.prof}</p>
                <div className="space-y-3">
                   <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                      <span>Progress</span>
                      <span>{course.progress}%</span>
                   </div>
                   <div className="h-2.5 w-full bg-[hsl(var(--surface-3))] rounded-full overflow-hidden">
                      <div className={`h-full ${course.color} transition-all duration-1000`} style={{ width: `${course.progress}%` }} />
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-4">
             {assignments.map((task, i) => (
               <div key={i} className="panel p-5 flex items-center justify-between hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-5">
                     <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${task.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {task.status === 'pending' ? <Timer className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
                     </div>
                     <div>
                        <h4 className="font-bold text-lg">{task.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 font-medium">
                           <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {task.course}</span>
                           <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {task.due}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>{task.priority}</span>
                     {task.status === 'graded' ? <div className="text-xl font-black text-emerald-400">{task.grade}</div> : <button className="h-9 px-4 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary hover:text-white transition-all">Submit</button>}
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === "challenges" && (
          <div className="grid md:grid-cols-3 gap-6">
             {/* Daily highlight */}
             {todayChallenge && (
               <div className="md:col-span-2 panel p-8 bg-gradient-to-br from-primary/20 to-transparent border-primary/30 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/20 mb-6">
                       <Zap className="h-4 w-4 text-primary animate-pulse" />
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">Daily Challenge</span>
                    </div>
                    <h2 className="text-4xl font-black mb-4">{todayChallenge.title}</h2>
                    <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-xl">{todayChallenge.description}</p>
                  </div>
                  <button onClick={() => openChallenge(todayChallenge)} className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground font-black hover:scale-105 transition-all w-fit shadow-xl shadow-primary/30">Solve Challenge</button>
               </div>
             )}
             
             {/* List of other challenges */}
             <div className="panel p-6 space-y-4">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Past Problems</h3>
                <div className="space-y-3">
                   {challenges.slice(1, 6).map(c => (
                     <button key={c.id} onClick={() => openChallenge(c)} className="w-full p-4 rounded-xl hover:bg-[hsl(var(--surface-2))] transition-all text-left border border-transparent hover:border-border">
                        <div className="text-xs font-bold text-primary mb-1">{c.difficulty}</div>
                        <div className="font-bold text-sm truncate">{c.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-2">{format(new Date(c.active_date), "MMM dd, yyyy")}</div>
                     </button>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
