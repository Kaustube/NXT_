import { useState } from "react";
import { CheckCircle2, Circle, ChevronRight, AlertCircle, Lightbulb, Target, Plane, Users, Globe, Code2, Star, Award } from "lucide-react";

const CHECKLIST = [
  { id: 1, cat: "Resume", task: "Resume is 1 page, ATS-friendly format" },
  { id: 2, cat: "Resume", task: "GitHub link is active with pinned projects" },
  { id: 3, cat: "Resume", task: "LinkedIn profile complete — 500+ connections" },
  { id: 4, cat: "DSA", task: "Solved 100+ LeetCode problems (25+ Medium)" },
  { id: 5, cat: "DSA", task: "Covered arrays, trees, graphs, DP topics" },
  { id: 6, cat: "DSA", task: "Done 5+ mock contests on LeetCode / Codeforces" },
  { id: 7, cat: "Projects", task: "Have 2+ end-to-end deployed projects" },
  { id: 8, cat: "Projects", task: "Can explain tech stack and tradeoffs of each" },
  { id: 9, cat: "Soft Skills", task: "Practiced HR questions (Tell me about yourself…)" },
  { id: 10, cat: "Soft Skills", task: "Done 3+ mock interviews with peers or mentor" },
  { id: 11, cat: "Core CS", task: "Revised DBMS — normalization, indexes, transactions" },
  { id: 12, cat: "Core CS", task: "Revised OS — threads, scheduling, memory mgmt" },
  { id: 13, cat: "Core CS", task: "Revised CN — TCP/IP, HTTP, DNS, load balancers" },
  { id: 14, cat: "System Design", task: "Understand CAP theorem, caching, consistent hashing" },
  { id: 15, cat: "System Design", task: "Can design a URL shortener or messaging system" },
];

const STUDY_ABROAD = [
  {
    country: "Germany", flag: "🇩🇪",
    cost: "€500–1,500/month", tuition: "~€0–500/semester (public unis)",
    exams: ["IELTS 6.5+ or TOEFL 90+", "German A1–B2 (German-taught programs)", "GRE (some programs)", "SOP + 2 LORs"],
    work: "18-month post-study Blue Card pathway",
    scholarships: ["DAAD (fully funded)", "Deutschlandstipendium", "Erasmus+"],
    why: "Near-zero tuition at public universities. Strong engineering culture. Growing English-taught MS programs.",
    top: ["TU Munich", "KIT", "RWTH Aachen", "Heidelberg"],
    color: "from-yellow-500/10 to-transparent",
  },
  {
    country: "France", flag: "🇫🇷",
    cost: "€800–2,000/month", tuition: "€170–380/year (public unis)",
    exams: ["IELTS 6.0+ or TOEFL 80+", "French B2 (French-taught)", "GMAT (business schools)", "Portfolio (design programs)"],
    work: "2-year APS post-study visa",
    scholarships: ["Eiffel Excellence", "Charpak (India)", "Erasmus+"],
    why: "Grandes Écoles are world-class. Low cost. Great for business, fashion, engineering and art.",
    top: ["École Polytechnique", "HEC Paris", "Sciences Po", "Sorbonne"],
    color: "from-blue-500/10 to-red-500/10",
  },
  {
    country: "USA", flag: "🇺🇸",
    cost: "$1,500–4,000/month", tuition: "$20k–50k/year",
    exams: ["GRE Quant 160+ preferred", "TOEFL 100+ or IELTS 7.0+", "3 LORs + SOP"],
    work: "OPT 1 yr + STEM OPT 3 yrs",
    scholarships: ["Fulbright", "Inlaks Shivdasani", "TA/RA assistantships"],
    why: "Best for CS/tech research. Strong alumni networks. Largest STEM job market.",
    top: ["MIT", "Stanford", "Carnegie Mellon", "Georgia Tech"],
    color: "from-blue-600/10 to-red-600/10",
  },
  {
    country: "Canada", flag: "🇨🇦",
    cost: "CAD 1,500–3,000/month", tuition: "CAD 15k–30k/year",
    exams: ["IELTS 6.5+", "GRE (some programs)", "SOP + 2–3 LORs"],
    work: "PGWP up to 3 yrs. Clear PR pathway.",
    scholarships: ["Vanier CGS", "Ontario Trillium", "University merit awards"],
    why: "Strong PR pathway. Growing tech hubs in Toronto & Vancouver. Multicultural environment.",
    top: ["U of Toronto", "UBC", "McGill", "Waterloo"],
    color: "from-red-500/10 to-transparent",
  },
];

const RESOURCES = [
  { title: "Naukri Campus", desc: "Fresher jobs and campus drives", link: "https://campus.naukri.com/", icon: Users },
  { title: "Internshala", desc: "Best for internships in India", link: "https://internshala.com/", icon: Award },
  { title: "LinkedIn Jobs", desc: "Global jobs + recruiter access", link: "https://www.linkedin.com/jobs/", icon: Globe },
  { title: "LeetCode", desc: "DSA practice & company prep", link: "https://leetcode.com/", icon: Code2 },
  { title: "Glassdoor", desc: "Company reviews + salary data", link: "https://www.glassdoor.co.in/", icon: Star },
  { title: "Unstop", desc: "Campus hackathons & competitions", link: "https://unstop.com/", icon: Target },
];

type Tab = "placement" | "studyabroad";

function ChevronUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

export default function PlacementDashboard() {
  const [tab, setTab] = useState<Tab>("placement");
  const [checklist, setChecklist] = useState(CHECKLIST.map((c) => ({ ...c, done: false })));
  const [expanded, setExpanded] = useState<string | null>(null);

  const doneCount = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const pct = Math.round((doneCount / total) * 100);
  const readinessLabel = pct >= 80 ? "Interview Ready 🎉" : pct >= 50 ? "Getting There 💪" : pct >= 25 ? "Early Stage 📚" : "Just Starting 🌱";
  const readinessColor = pct >= 80 ? "text-success" : pct >= 50 ? "text-yellow-400" : pct >= 25 ? "text-orange-400" : "text-muted-foreground";

  const categories = [...new Set(checklist.map((c) => c.cat))];

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <header>
          <div className="text-xs uppercase tracking-wider text-primary font-bold mb-2">Career Prep</div>
          <h1 className="text-3xl font-display font-bold">Placement & Study Abroad</h1>
          <p className="text-muted-foreground mt-1.5">Track readiness and explore global study options.</p>
        </header>

        <div className="flex gap-2">
          {([["placement", "Placement Prep", Target], ["studyabroad", "Study Abroad", Plane]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${tab === id ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))]"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {tab === "placement" && (
          <div className="space-y-6">
            {/* Score */}
            <div className="panel p-6 bg-gradient-to-br from-primary/10 to-transparent">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Readiness Score</div>
                  <div className="text-5xl font-display font-bold">{pct}%</div>
                  <div className={`text-sm font-semibold mt-1 ${readinessColor}`}>{readinessLabel}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm text-muted-foreground">{doneCount}/{total} tasks</div>
                  <div className="w-48 h-3 bg-[hsl(var(--surface-3))] rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-[hsl(var(--surface-2))] p-3 rounded-lg">
                <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                <span>{pct < 25 ? "Start with your resume and LinkedIn." : pct < 50 ? "Ramp up DSA — 5 problems/week minimum." : pct < 80 ? "Focus on system design and mock interviews." : "Start applying and book mock interviews!"}</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              {categories.map((cat) => {
                const items = checklist.filter((c) => c.cat === cat);
                const catDone = items.filter((c) => c.done).length;
                return (
                  <div key={cat} className="panel p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold">{cat} <span className="text-muted-foreground font-normal">{catDone}/{items.length}</span></span>
                      <div className="w-20 h-1.5 bg-[hsl(var(--surface-3))] rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(catDone / items.length) * 100}%` }} />
                      </div>
                    </div>
                    {items.map((item) => (
                      <div key={item.id} onClick={() => setChecklist((p) => p.map((c) => c.id === item.id ? { ...c, done: !c.done } : c))}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[hsl(var(--surface-2))] cursor-pointer group">
                        {item.done ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />}
                        <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.task}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Resources */}
            <div>
              <h2 className="text-lg font-bold mb-3">Key Platforms</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {RESOURCES.map((r) => (
                  <a key={r.title} href={r.link} target="_blank" rel="noopener noreferrer"
                    className="panel p-4 flex items-start gap-3 hover:border-primary/40 transition-colors group">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                      <r.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold group-hover:text-primary transition-colors">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "studyabroad" && (
          <div className="space-y-4">
            <div className="panel p-4 flex items-start gap-3 bg-primary/5">
              <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">Start planning <strong className="text-foreground">18–24 months in advance.</strong> Shortlist universities by August of your 3rd year for Fall intake the following year.</p>
            </div>
            {STUDY_ABROAD.map((c) => {
              const isOpen = expanded === c.country;
              return (
                <div key={c.country} className="panel overflow-hidden">
                  <div className={`p-5 bg-gradient-to-r ${c.color} cursor-pointer`} onClick={() => setExpanded(isOpen ? null : c.country)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{c.flag}</span>
                        <div>
                          <div className="font-bold text-lg">{c.country}</div>
                          <div className="text-xs text-muted-foreground">{c.top.slice(0, 2).join(" · ")}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right text-sm font-semibold">{c.cost}</div>
                        {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-4 border-t border-border/50 grid sm:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs uppercase font-bold text-muted-foreground mb-1.5">Top Universities</div>
                          <div className="flex flex-wrap gap-1.5">{c.top.map((u) => <span key={u} className="chip">{u}</span>)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase font-bold text-muted-foreground mb-1.5">Exams Required</div>
                          <ul className="space-y-1">{c.exams.map((e) => <li key={e} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{e}</li>)}</ul>
                        </div>
                        <div>
                          <div className="text-xs uppercase font-bold text-muted-foreground mb-1">Work After Study</div>
                          <p className="text-sm text-muted-foreground">{c.work}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs uppercase font-bold text-muted-foreground mb-1.5">Costs</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Tuition</span><span className="font-medium">{c.tuition}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Living</span><span className="font-medium">{c.cost}</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase font-bold text-muted-foreground mb-1.5">Scholarships</div>
                          <div className="flex flex-wrap gap-1.5">{c.scholarships.map((s) => <span key={s} className="chip">{s}</span>)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase font-bold text-muted-foreground mb-1">Why {c.country}?</div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{c.why}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
