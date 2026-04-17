import { useEffect, useState } from "react";
import {
  BookOpen,
  Clock,
  FileText,
  CheckCircle,
  Video,
  Code2,
  Flame,
  Trophy,
  ChevronRight,
  Play,
  BarChart3,
  Zap,
  GraduationCap,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

// College-specific course data
const COLLEGE_COURSES: Record<string, Array<{ id: string; name: string; prof: string; time: string; progress: number; color: string }>> = {
  BU: [
    { id: "CSET244", name: "Design & Analysis of Algorithms", prof: "Dr. Vijayant Pawar", time: "Mon, Wed 10:00 AM", progress: 65, color: "bg-blue-500" },
    { id: "CSET210", name: "Design Thinking and Innovation", prof: "Dr. Urvashi Sugandh", time: "Tue, Thu 2:00 PM", progress: 72, color: "bg-purple-500" },
    { id: "CSET203", name: "Microprocessors and Computer Networks", prof: "Mr. Kishan Yumnam", time: "Mon, Fri 4:00 PM", progress: 55, color: "bg-green-500" },
    { id: "CSET209", name: "Operating System", prof: "Dr. Akhil Kumar", time: "Wed, Fri 9:00 AM", progress: 48, color: "bg-orange-500" },
  ],
  IITD: [
    { id: "COL106", name: "Data Structures & Algorithms", prof: "Prof. Subhashis Banerjee", time: "Mon, Wed, Fri 9:00 AM", progress: 70, color: "bg-blue-500" },
    { id: "COL216", name: "Computer Architecture", prof: "Prof. Anshul Kumar", time: "Tue, Thu 11:00 AM", progress: 58, color: "bg-red-500" },
    { id: "COL334", name: "Computer Networks", prof: "Prof. Huzur Saran", time: "Mon, Wed 2:00 PM", progress: 45, color: "bg-green-500" },
    { id: "COL351", name: "Analysis & Design of Algorithms", prof: "Prof. Naveen Garg", time: "Tue, Thu 3:30 PM", progress: 62, color: "bg-yellow-500" },
  ],
  DU: [
    { id: "CS301", name: "Theory of Computation", prof: "Dr. Pankaj Jalote", time: "Mon, Wed 10:00 AM", progress: 55, color: "bg-blue-500" },
    { id: "CS302", name: "Database Management Systems", prof: "Dr. Saroj Kaushik", time: "Tue, Thu 1:00 PM", progress: 68, color: "bg-purple-500" },
    { id: "CS303", name: "Software Engineering", prof: "Dr. Vasudha Bhatnagar", time: "Mon, Fri 3:00 PM", progress: 40, color: "bg-green-500" },
    { id: "CS304", name: "Artificial Intelligence", prof: "Dr. Naveen Kumar", time: "Wed, Fri 11:00 AM", progress: 75, color: "bg-orange-500" },
  ],
};

const COLLEGE_ASSIGNMENTS: Record<string, Array<{ title: string; course: string; due: string; status: string; type: string; grade?: string }>> = {
  BU: [
    { title: "Project 1: Algorithm Analysis Report", course: "CSET244", due: "Tomorrow, 11:59 PM", status: "pending", type: "Project" },
    { title: "Design Thinking Case Study", course: "CSET210", due: "Apr 20, 11:59 PM", status: "pending", type: "Assignment" },
    { title: "MCN Lab Assignment 3", course: "CSET203", due: "Apr 22, 11:59 PM", status: "submitted", type: "Homework" },
    { title: "OS Concepts Quiz", course: "CSET209", due: "Apr 18, 9:00 AM", status: "graded", type: "Quiz", grade: "9.5/10" },
  ],
  IITD: [
    { title: "Assignment 2: Red-Black Trees", course: "COL106", due: "Tomorrow, 11:59 PM", status: "pending", type: "Assignment" },
    { title: "Lab 3: Pipeline Simulation", course: "COL216", due: "Apr 21, 11:59 PM", status: "submitted", type: "Lab" },
    { title: "Minor Project: Chat Protocol", course: "COL334", due: "Apr 25, 11:59 PM", status: "pending", type: "Project" },
    { title: "Quiz 2: Greedy Algorithms", course: "COL351", due: "Apr 19, 9:00 AM", status: "graded", type: "Quiz", grade: "18/20" },
  ],
  DU: [
    { title: "Assignment 3: NFA to DFA Conversion", course: "CS301", due: "Tomorrow, 11:59 PM", status: "pending", type: "Assignment" },
    { title: "Lab 4: SQL Queries", course: "CS302", due: "Apr 20, 11:59 PM", status: "submitted", type: "Lab" },
    { title: "SRS Document", course: "CS303", due: "Apr 23, 11:59 PM", status: "pending", type: "Project" },
    { title: "Mid-sem: Search Algorithms", course: "CS304", due: "Apr 18, 9:00 AM", status: "graded", type: "Quiz", grade: "28/30" },
  ],
};

type Challenge = {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string | null;
  active_date: string;
};

type Submission = {
  id: string;
  challenge_id: string;
  language: string;
  code: string;
  status: string;
  submitted_at: string;
};

const DIFFICULTY_COLOR = {
  easy: "text-emerald-400 bg-emerald-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  hard: "text-red-400 bg-red-400/10",
};

const STARTER_CODE: Record<string, string> = {
  python: "def solution():\n    # Write your solution here\n    pass\n",
  javascript: "function solution() {\n  // Write your solution here\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // Write your solution here\n  return 0;\n}\n",
  java: "public class Solution {\n  public static void main(String[] args) {\n    // Write your solution here\n  }\n}\n",
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
    const { data: prof } = await supabase
      .from("profiles")
      .select("college_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if ((prof as any)?.college_id) {
      const { data: col } = await supabase
        .from("colleges")
        .select("short_code, name")
        .eq("id", (prof as any).college_id)
        .maybeSingle();
      setCollegeCode((col as any)?.short_code ?? null);
      setCollegeName((col as any)?.name ?? null);
    }
  }

  const courses = collegeCode ? (COLLEGE_COURSES[collegeCode] ?? COLLEGE_COURSES["BU"]) : null;
  const assignments = collegeCode ? (COLLEGE_ASSIGNMENTS[collegeCode] ?? COLLEGE_ASSIGNMENTS["BU"]) : null;

  async function loadChallenges() {
    if (!user) return;
    const [{ data: ch }, { data: subs }] = await Promise.all([
      supabase
        .from("coding_challenges")
        .select("*")
        .order("active_date", { ascending: false })
        .limit(20),
      supabase
        .from("challenge_submissions")
        .select("*")
        .eq("user_id", user.id),
    ]);
    setChallenges((ch as Challenge[]) ?? []);
    const subMap: Record<string, Submission> = {};
    ((subs as Submission[]) ?? []).forEach((s) => (subMap[s.challenge_id] = s));
    setSubmissions(subMap);
  }

  async function loadStreak() {
    if (!user) return;
    const { data } = await supabase
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", user.id)
      .maybeSingle();
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
        await supabase
          .from("challenge_submissions")
          .update({ code, language, status: "submitted", submitted_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("challenge_submissions").insert({
          challenge_id: activeChallenge.id,
          user_id: user.id,
          language,
          code,
          status: "submitted",
        });
      }
      toast.success("Solution submitted! 🎉");
      await loadChallenges();
      setActiveChallenge(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const todayChallenge = challenges.find(
    (c) => c.active_date === format(new Date(), "yyyy-MM-dd"),
  );
  const solvedCount = Object.values(submissions).filter((s) => s.status !== "wrong").length;

  // Challenge detail view
  if (activeChallenge) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Problem panel */}
        <div className="w-[45%] shrink-0 border-r border-border overflow-auto p-6 space-y-5">
          <button
            onClick={() => setActiveChallenge(null)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            ← Back to challenges
          </button>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${DIFFICULTY_COLOR[activeChallenge.difficulty]}`}>
                {activeChallenge.difficulty}
              </span>
              {submissions[activeChallenge.id] && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-400/10 text-emerald-400">
                  ✓ Submitted
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-1">{activeChallenge.title}</h1>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {activeChallenge.tags.map((t) => (
                <span key={t} className="chip text-xs">{t}</span>
              ))}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {activeChallenge.description}
            </p>
          </div>

          {activeChallenge.examples.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Examples</h3>
              <div className="space-y-3">
                {activeChallenge.examples.map((ex, i) => (
                  <div key={i} className="panel-2 p-3 text-xs font-mono space-y-1">
                    <div><span className="text-muted-foreground">Input: </span>{ex.input}</div>
                    <div><span className="text-muted-foreground">Output: </span>{ex.output}</div>
                    {ex.explanation && (
                      <div className="text-muted-foreground">{ex.explanation}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeChallenge.constraints && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Constraints</h3>
              <div className="panel-2 p-3 text-xs font-mono text-muted-foreground">
                {activeChallenge.constraints.split("|").map((c, i) => (
                  <div key={i}>• {c.trim()}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Code editor panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 border-b border-border px-4 flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                if (!submissions[activeChallenge.id]) {
                  setCode(STARTER_CODE[e.target.value] ?? "");
                }
              }}
              className="h-7 px-2 rounded-md bg-[hsl(var(--surface-2))] border border-border text-xs outline-none"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto">
              {code.length} chars
            </span>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 p-4 bg-[hsl(var(--surface-1))] text-sm font-mono resize-none outline-none text-foreground/90 leading-relaxed"
            placeholder="Write your solution here…"
          />

          <div className="h-14 border-t border-border px-4 flex items-center justify-end gap-3">
            <button
              onClick={() => setActiveChallenge(null)}
              className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-[hsl(var(--surface-2))] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitSolution}
              disabled={submitting || !code.trim()}
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary grid place-items-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Learning Management</h1>
              {collegeName && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{collegeName}</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">Courses, assignments, and daily coding challenges.</p>
        </header>

        <div className="flex gap-4 border-b border-border/50">
          {(["courses", "assignments", "challenges"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold border-b-2 transition-all capitalize ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "challenges" ? "Daily Challenges" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "courses" && (
          !courses ? (
            <div className="panel p-12 text-center">
              <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-semibold mb-1">College not linked</p>
              <p className="text-sm text-muted-foreground">Your account isn't linked to a college. Update your profile to see your courses.</p>
            </div>
          ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div key={course.id} className="panel p-5 group hover:border-primary/50 transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-12 w-12 rounded-xl grid place-items-center text-white shadow-lg ${course.color}`}>
                    <span className="font-bold text-sm">{course.id.substring(0, 2)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{course.name}</h3>
                    <p className="text-xs text-muted-foreground">{course.id} · {course.prof}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-[hsl(var(--surface-2))] p-2 rounded-md mb-4">
                  <Clock className="h-3.5 w-3.5" /> {course.time}
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-[hsl(var(--surface-3))] rounded-full overflow-hidden">
                    <div className={`h-full ${course.color} transition-all duration-1000`} style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 h-8 rounded-md bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                    <FileText className="h-3 w-3" /> Materials
                  </button>
                  <button className="flex-1 h-8 rounded-md bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                    <Video className="h-3 w-3" /> Lecture
                  </button>
                </div>
              </div>
            ))}
          </div>
          )
        )}

        {activeTab === "assignments" && (
          !assignments ? (
            <div className="panel p-12 text-center">
              <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-semibold mb-1">College not linked</p>
              <p className="text-sm text-muted-foreground">Link your college in your profile to see assignments.</p>
            </div>
          ) : (
          <div className="space-y-3">
            {assignments.map((task, i) => (
              <div key={i} className="panel-2 p-4 flex items-center justify-between hover:border-border transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full grid place-items-center ${
                    task.status === "pending" ? "bg-orange-500/20 text-orange-500" :
                    task.status === "submitted" ? "bg-blue-500/20 text-blue-500" :
                    "bg-emerald-500/20 text-emerald-500"
                  }`}>
                    {task.status === "pending" ? <Clock className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{task.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.course} · {task.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  {task.status === "graded" ? (
                    <div className="text-emerald-400 font-bold text-lg">{task.grade}</div>
                  ) : (
                    <div className="text-xs font-medium bg-[hsl(var(--surface-3))] px-2.5 py-1 rounded-md">
                      Due: {task.due}
                    </div>
                  )}
                  {task.status === "pending" && (
                    <button className="mt-2 text-xs font-bold text-primary hover:underline">Submit Now →</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )
        )}

        {activeTab === "challenges" && (
          <div className="space-y-6">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="panel p-4 flex items-center gap-3">
                <Flame className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-xl font-bold text-orange-400">{streak}</div>
                  <div className="text-xs text-muted-foreground">Day streak</div>
                </div>
              </div>
              <div className="panel p-4 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <div>
                  <div className="text-xl font-bold">{solvedCount}</div>
                  <div className="text-xs text-muted-foreground">Solved</div>
                </div>
              </div>
              <div className="panel p-4 flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xl font-bold">{challenges.length}</div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
              </div>
            </div>

            {/* Today's challenge highlight */}
            {todayChallenge && (
              <div className="panel p-5 border-primary/30 bg-primary/5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary animate-pulse">
                    TODAY
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Daily Challenge</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{todayChallenge.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${DIFFICULTY_COLOR[todayChallenge.difficulty]}`}>
                    {todayChallenge.difficulty}
                  </span>
                  {todayChallenge.tags.slice(0, 3).map((t) => (
                    <span key={t} className="chip text-xs">{t}</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {todayChallenge.description}
                </p>
                <button
                  onClick={() => openChallenge(todayChallenge)}
                  className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity w-fit"
                >
                  <Code2 className="h-4 w-4" />
                  {submissions[todayChallenge.id] ? "View Submission" : "Solve Now"}
                </button>
              </div>
            )}

            {/* All challenges */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                All Challenges
              </h3>
              <div className="space-y-2">
                {challenges.map((c) => {
                  const sub = submissions[c.id];
                  const isToday = c.active_date === format(new Date(), "yyyy-MM-dd");
                  return (
                    <button
                      key={c.id}
                      onClick={() => openChallenge(c)}
                      className="w-full panel-2 p-4 flex items-center gap-4 hover:border-primary/30 transition-all text-left group"
                    >
                      <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                        sub ? "bg-emerald-500/20 text-emerald-400" : "bg-[hsl(var(--surface-3))] text-muted-foreground"
                      }`}>
                        {sub ? <CheckCircle className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {c.title}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary">TODAY</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLOR[c.difficulty].split(" ")[0]}`}>
                            {c.difficulty}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          {c.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-xs text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(c.active_date), "MMM d")}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  );
                })}
                {challenges.length === 0 && (
                  <div className="panel p-10 text-center text-muted-foreground text-sm">
                    No challenges yet. Run the migration to seed them.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
