import { useState, useMemo } from "react";
import {
  Briefcase, Award, BookOpen, MapPin, Clock, DollarSign,
  ExternalLink, Search, Filter, ChevronDown, ChevronUp,
  Building2, GraduationCap, Star, CheckCircle2, Calendar,
} from "lucide-react";
import { RequestListingAccessDialog } from "@/components/RequestListingAccessDialog";

// ─── DATA ────────────────────────────────────────────────────────────────────

const INTERNSHIPS = [
  {
    id: 1,
    company: "Google",
    role: "Software Engineering Intern",
    location: "Hyderabad / Remote",
    duration: "12 weeks",
    stipend: "₹1,20,000/month",
    deadline: "Dec 1, 2025",
    tags: ["Tech", "SWE", "Top-tier"],
    requirements: [
      "B.Tech CSE / IT (2nd–4th year)",
      "Strong DSA fundamentals (LeetCode Medium proficiency)",
      "At least one programming language: Python, Java, or C++",
      "Good CGPA (typically 7.5+ preferred)",
      "Prior project experience or open-source contributions",
    ],
    description:
      "Work on real Google products alongside full-time engineers. Interns get a dedicated mentor and contribute directly to production code.",
    applyLink: "https://careers.google.com/students/",
    color: "from-blue-500/20 to-cyan-500/20",
    badge: "bg-blue-500",
  },
  {
    id: 2,
    company: "Microsoft",
    role: "Research Intern (AI / ML)",
    location: "Bengaluru",
    duration: "10 weeks",
    stipend: "₹90,000/month",
    deadline: "Nov 15, 2025",
    tags: ["AI/ML", "Research", "Tech"],
    requirements: [
      "3rd or 4th year B.Tech / M.Tech",
      "Solid understanding of ML concepts (regression, CNNs, transformers)",
      "Python with NumPy, PyTorch or TensorFlow",
      "CGPA 8.0+",
      "Published paper or strong project portfolio is a plus",
    ],
    description:
      "Join Microsoft Research India to work on cutting-edge AI problems. Past interns have published papers at top-tier conferences.",
    applyLink: "https://careers.microsoft.com/students/",
    color: "from-purple-500/20 to-blue-500/20",
    badge: "bg-purple-500",
  },
  {
    id: 3,
    company: "Goldman Sachs",
    role: "Technology Summer Analyst",
    location: "Bengaluru / Mumbai",
    duration: "10 weeks",
    stipend: "₹1,00,000/month",
    deadline: "Oct 30, 2025",
    tags: ["Finance", "Tech", "Quant"],
    requirements: [
      "3rd year B.Tech (graduating in 2027)",
      "Strong coding skills — Java or Python",
      "Interest in financial systems and markets",
      "Problem-solving and analytical mindset",
      "No specific CGPA cutoff but strong academic record preferred",
    ],
    description:
      "Rotate across engineering divisions within Goldman's technology group — distributed systems, security, data platforms, and more.",
    applyLink: "https://www.goldmansachs.com/careers/students/",
    color: "from-yellow-500/20 to-orange-500/20",
    badge: "bg-yellow-500",
  },
  {
    id: 4,
    company: "Figma",
    role: "Product Design Intern",
    location: "Remote (India eligible)",
    duration: "12 weeks",
    stipend: "₹75,000/month",
    deadline: "Jan 10, 2026",
    tags: ["Design", "Product", "UI/UX"],
    requirements: [
      "Any year, any branch",
      "Portfolio showcasing at least 2–3 case studies",
      "Proficiency in Figma (of course), basic prototyping skills",
      "Understanding of user research and usability principles",
      "Good written communication in English",
    ],
    description:
      "Work with Figma's product team to design new features used by millions of designers globally. Heavy emphasis on user research.",
    applyLink: "https://www.figma.com/careers/",
    color: "from-pink-500/20 to-purple-500/20",
    badge: "bg-pink-500",
  },
  {
    id: 5,
    company: "ISRO",
    role: "Research Intern (Aerospace / Electronics)",
    location: "Ahmedabad / Bengaluru / Thiruvananthapuram",
    duration: "8 weeks",
    stipend: "₹8,000/month",
    deadline: "Mar 1, 2026",
    tags: ["Government", "Research", "STEM"],
    requirements: [
      "B.Tech / B.E. students in ECE, EEE, Mechanical, CS",
      "CGPA 7.0+ (institute-specific thresholds may apply)",
      "Recommendation letter from faculty",
      "Indian national only",
      "Strong interest in space technology",
    ],
    description:
      "Gain hands-on exposure to India's space programme. Interns work at ISRO centres on ongoing satellite and launch vehicle projects.",
    applyLink: "https://www.isro.gov.in/",
    color: "from-orange-500/20 to-red-500/20",
    badge: "bg-orange-500",
  },
  {
    id: 6,
    company: "Razorpay",
    role: "Backend Engineering Intern",
    location: "Bengaluru",
    duration: "6 months",
    stipend: "₹60,000/month",
    deadline: "Rolling",
    tags: ["Fintech", "Backend", "Startup"],
    requirements: [
      "2nd–4th year B.Tech CSE / IT",
      "Good understanding of REST APIs and databases (SQL + NoSQL)",
      "Experience with any backend language (Node.js, Go, Java)",
      "Familiarity with system design basics",
      "Past internship or personal project preferred",
    ],
    description:
      "Help build Razorpay's payment infrastructure that handles millions of transactions a day. Fast-paced fintech environment.",
    applyLink: "https://razorpay.com/jobs/",
    color: "from-cyan-500/20 to-blue-500/20",
    badge: "bg-cyan-500",
  },
];

const JOBS = [
  {
    id: 1,
    company: "Amazon",
    role: "SDE-1 (New Grad)",
    location: "Hyderabad / Bengaluru",
    type: "Full-time",
    salary: "₹24–32 LPA",
    deadline: "Nov 30, 2025",
    tags: ["Tech", "FAANG", "New Grad"],
    requirements: [
      "B.Tech/M.Tech in CS, IT or related (2024–2025 batch)",
      "Strong DSA — Leetcode Hard level recommended",
      "System design basics (for experienced roles, full deep-dive expected)",
      "CGPA 7.0+ (Amazon typically no hard cutoff but competitive)",
      "2 or more SWE internships or strong project work",
    ],
    description:
      "Amazon's SDE-1 new-grad programme takes the best engineering talent globally. Roles span AWS, retail, Alexa, and more.",
    applyLink: "https://www.amazon.jobs/en/",
    color: "from-orange-500/20 to-yellow-500/20",
    badge: "bg-orange-500",
  },
  {
    id: 2,
    company: "Zepto",
    role: "Product Manager — Growth",
    location: "Mumbai",
    type: "Full-time",
    salary: "₹18–26 LPA",
    deadline: "Dec 15, 2025",
    tags: ["Product", "Growth", "Startup"],
    requirements: [
      "Any branch — MBA or B.Tech/MBA dual degree preferred",
      "Analytical mindset — strong SQL and Excel",
      "1–2 years of PM experience or strong internship",
      "Understanding of product metrics (DAU, retention, funnel analysis)",
      "Excellent communication and stakeholder management",
    ],
    description:
      "Drive growth experiments and own the user acquisition funnel at one of India's fastest-growing quick-commerce startups.",
    applyLink: "https://www.zepto.com/careers",
    color: "from-purple-500/20 to-pink-500/20",
    badge: "bg-purple-500",
  },
  {
    id: 3,
    company: "Deloitte USI",
    role: "Analyst — Technology Consulting",
    location: "Pan India",
    type: "Full-time",
    salary: "₹7–9 LPA",
    deadline: "Campus Drive (contact TPO)",
    tags: ["Consulting", "Tech", "Campus"],
    requirements: [
      "B.Tech any branch (2025 batch)",
      "CGPA 6.5+ (strict for campus drives)",
      "Aptitude, verbal, and reasoning tests during selection",
      "Good communication and presentation skills",
      "Willingness to travel and relocate",
    ],
    description:
      "Join Deloitte's technology consulting arm. Work with Fortune 500 clients on digital transformation, cloud, and enterprise systems.",
    applyLink: "https://jobs2.deloitte.com/in/en",
    color: "from-green-500/20 to-teal-500/20",
    badge: "bg-green-500",
  },
  {
    id: 4,
    company: "Josh Talks",
    role: "Content & Marketing Associate",
    location: "New Delhi / Remote",
    type: "Full-time",
    salary: "₹4–6 LPA",
    deadline: "Rolling",
    tags: ["Content", "Marketing", "Media"],
    requirements: [
      "Any degree — Journalism, Mass Comm, or related preferred",
      "Excellent Hindi and English writing skills",
      "Portfolio of written or video content",
      "Understanding of social media algorithms (Instagram, YouTube)",
      "Freshers welcome",
    ],
    description:
      "Create and distribute content that inspires millions of young Indians. Be part of one of India's largest youth media brands.",
    applyLink: "https://www.joshtalks.com/",
    color: "from-red-500/20 to-orange-500/20",
    badge: "bg-red-500",
  },
  {
    id: 5,
    company: "CRED",
    role: "Data Analyst",
    location: "Bengaluru",
    type: "Full-time",
    salary: "₹12–18 LPA",
    deadline: "Jan 15, 2026",
    tags: ["Data", "Analytics", "Fintech"],
    requirements: [
      "B.Tech/BCA or BSc Statistics/Mathematics",
      "Strong SQL and Python (pandas, matplotlib)",
      "Experience with BI tools (Tableau, Metabase, or Looker)",
      "Ability to communicate insights to non-technical stakeholders",
      "Internship in a data role is a strong plus",
    ],
    description:
      "Dig into CRED's rich payments data to unlock insights that drive product decisions. Work closely with product and engineering.",
    applyLink: "https://careers.cred.club/",
    color: "from-slate-500/20 to-zinc-500/20",
    badge: "bg-slate-500",
  },
];

const CERTIFICATIONS = [
  {
    id: 1,
    name: "AWS Certified Solutions Architect – Associate",
    provider: "Amazon Web Services",
    duration: "~3 months prep",
    cost: "₹12,000 (exam fee)",
    level: "Intermediate",
    tags: ["Cloud", "AWS", "High ROI"],
    requirements: [
      "Basic understanding of networking (IP, DNS, load balancing)",
      "Familiarity with at least one cloud service (EC2, S3, etc.)",
      "6+ months hands-on AWS experience recommended before exam",
      "No formal prerequisites — anyone can attempt",
    ],
    description:
      "One of the most recognised cloud certifications globally. Opens doors to cloud engineer and architect roles. Highly valued by recruiters.",
    link: "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
    color: "from-yellow-500/20 to-orange-500/20",
    badge: "bg-yellow-500",
  },
  {
    id: 2,
    name: "Google Data Analytics Professional Certificate",
    provider: "Google (via Coursera)",
    duration: "6 months (at own pace)",
    cost: "Free audit / ₹3,200/month Coursera",
    level: "Beginner",
    tags: ["Data", "Analytics", "Google"],
    requirements: [
      "No prior experience required",
      "Willingness to learn SQL, spreadsheets, Tableau, and R",
      "Roughly 10 hrs/week recommended",
      "Basic computer literacy",
    ],
    description:
      "Covers the full data analytics workflow — ask, prepare, process, analyse, share, and act. Designed for complete beginners.",
    link: "https://grow.google/certificates/data-analytics/",
    color: "from-blue-500/20 to-green-500/20",
    badge: "bg-blue-500",
  },
  {
    id: 3,
    name: "Meta Front-End Developer Professional Certificate",
    provider: "Meta (via Coursera)",
    duration: "7 months",
    cost: "Free audit / ₹3,200/month Coursera",
    level: "Beginner–Intermediate",
    tags: ["Web Dev", "React", "Frontend"],
    requirements: [
      "No prior coding experience needed for the first few courses",
      "Comfort with HTML/CSS recommended from course 3 onwards",
      "~6 hrs/week",
      "Access to a laptop/PC",
    ],
    description:
      "Designed by Meta engineers — covers HTML, CSS, JavaScript, React, version control, and UX. Ends with a portfolio capstone project.",
    link: "https://www.coursera.org/professional-certificates/meta-front-end-developer",
    color: "from-blue-600/20 to-indigo-500/20",
    badge: "bg-blue-600",
  },
  {
    id: 4,
    name: "CFA Level 1",
    provider: "CFA Institute",
    duration: "6–12 months prep",
    cost: "USD 900–1,200 (registration)",
    level: "Advanced",
    tags: ["Finance", "Investment", "CFA"],
    requirements: [
      "Bachelor's degree (or in final year) in any discipline",
      "Strong grasp of maths and statistics",
      "300+ hours of dedicated study recommended",
      "English proficiency",
      "Commitment — historically ~40% pass rate",
    ],
    description:
      "The gold standard for investment professionals. Opens roles in asset management, equity research, investment banking, and portfolio management.",
    link: "https://www.cfainstitute.org/",
    color: "from-amber-500/20 to-yellow-500/20",
    badge: "bg-amber-500",
  },
  {
    id: 5,
    name: "Certified Kubernetes Administrator (CKA)",
    provider: "CNCF / Linux Foundation",
    duration: "2–3 months prep",
    cost: "USD 395",
    level: "Advanced",
    tags: ["DevOps", "Cloud-Native", "K8s"],
    requirements: [
      "Comfortable with Linux command line",
      "Hands-on experience with Docker and containers",
      "Basic understanding of networking (TCP/IP, DNS)",
      "Prior exposure to Kubernetes concepts",
    ],
    description:
      "Highly sought-after for DevOps and Platform Engineering roles. It's a performance-based exam — you administer a live Kubernetes cluster.",
    link: "https://www.cncf.io/certification/cka/",
    color: "from-cyan-500/20 to-blue-500/20",
    badge: "bg-cyan-500",
  },
  {
    id: 6,
    name: "Google UX Design Professional Certificate",
    provider: "Google (via Coursera)",
    duration: "6 months",
    cost: "Free audit / ₹3,200/month Coursera",
    level: "Beginner",
    tags: ["UX", "Design", "Google"],
    requirements: [
      "No experience required",
      "Access to Figma (free tier is sufficient)",
      "~10 hrs/week",
      "Creativity and curiosity about human behaviour",
    ],
    description:
      "Covers the full UX design process: empathise, define, ideate, prototype, and test. Build a professional UX portfolio of three projects.",
    link: "https://grow.google/certificates/ux-design/",
    color: "from-green-500/20 to-emerald-500/20",
    badge: "bg-green-500",
  },
];

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Tab = "internships" | "jobs" | "certifications";

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function Opportunities() {
  const [tab, setTab] = useState<Tab>("internships");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "internships", label: "Internships", icon: Briefcase, count: INTERNSHIPS.length },
    { id: "jobs", label: "Jobs", icon: Building2, count: JOBS.length },
    { id: "certifications", label: "Certifications", icon: Award, count: CERTIFICATIONS.length },
  ];

  const allTags = useMemo(() => {
    const sets = {
      internships: INTERNSHIPS.flatMap((i) => i.tags),
      jobs: JOBS.flatMap((j) => j.tags),
      certifications: CERTIFICATIONS.flatMap((c) => c.tags),
    };
    return [...new Set(sets[tab])];
  }, [tab]);

  const data = tab === "internships" ? INTERNSHIPS : tab === "jobs" ? JOBS : CERTIFICATIONS;

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const q = search.toLowerCase();
      const nameMatch =
        ("role" in item ? item.role : item.name).toLowerCase().includes(q) ||
        item.company?.toLowerCase().includes(q) ||
        ("provider" in item ? item.provider : "").toLowerCase().includes(q);
      const tagMatch = tagFilter ? item.tags.includes(tagFilter) : true;
      return (q ? nameMatch : true) && tagMatch;
    });
  }, [data, search, tagFilter]);

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto w-full space-y-8">

        {/* Header */}
        <header>
          <div className="text-xs uppercase tracking-wider text-primary font-bold mb-2">Career Hub</div>
          <h1 className="text-3xl font-display font-bold text-foreground">Opportunities</h1>
          <p className="text-muted-foreground mt-1.5">
            Internships, jobs, and certifications — with everything you need to apply.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(""); setTagFilter(null); setExpanded(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                tab === t.id
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))]"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span className="ml-1 text-xs bg-[hsl(var(--surface-3))] px-1.5 py-0.5 rounded-full">{t.count}</span>
            </button>
          ))}
        </div>

        {(tab === "internships" || tab === "jobs") && (
          <div className="panel p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
            <div>
              <div className="text-xs uppercase tracking-wider text-primary font-semibold">For companies and organizers</div>
              <div className="text-sm font-semibold mt-1">
                {tab === "jobs" ? "Need job listing access?" : "Need internship listing access?"}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Send one request ticket to admin first. After approval, the account can list roles here without any separate registration type.
              </p>
            </div>
            <RequestListingAccessDialog
              services={[{ value: tab, label: tab === "jobs" ? "Jobs" : "Internships" }]}
              defaultService={tab}
              title={tab === "jobs" ? "Request job listing access" : "Request internship listing access"}
              description={
                tab === "jobs"
                  ? "Share your company details and the jobs you plan to publish. The admin team will review this request before enabling job listings."
                  : "Share your company details and the internships you plan to publish. The admin team will review this request before enabling internship listings."
              }
            />
          </div>
        )}

        {/* Search + Tag filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTagFilter(null)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
                !tagFilter ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  tagFilter === tag ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">Nothing matches. Try a different search.</div>
          )}
          {filtered.map((item) => {
            const isOpen = expanded === item.id;
            const title = "role" in item ? item.role : item.name;
            const subtitle = "company" in item ? item.company : item.provider;
            const meta1 = "location" in item ? item.location : item.duration;
            const meta2 = "stipend" in item ? item.stipend : "salary" in item ? item.salary : item.cost;
            const deadline = "deadline" in item ? item.deadline : null;
            const link = "applyLink" in item ? item.applyLink : item.link;
            const linkLabel = tab === "certifications" ? "Learn More" : "Apply Now";

            return (
              <div key={item.id} className={`panel overflow-hidden transition-all`}>
                {/* Card header — always visible */}
                <div
                  className={`p-5 bg-gradient-to-r ${item.color} cursor-pointer`}
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl ${item.badge} grid place-items-center text-white text-sm font-bold shrink-0`}>
                        {subtitle[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">{title}</div>
                        <div className="text-sm text-muted-foreground">{subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((t) => (
                          <span key={t} className="chip text-[10px] py-0.5">{t}</span>
                        ))}
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                    {meta1 && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {meta1}
                      </span>
                    )}
                    {meta2 && (
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        {meta2}
                      </span>
                    )}
                    {deadline && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Deadline: {deadline}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-4 space-y-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>

                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold mb-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Requirements
                      </div>
                      <ul className="space-y-1.5">
                        {item.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition"
                    >
                      {linkLabel} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
