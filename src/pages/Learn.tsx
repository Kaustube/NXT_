import { Code2, Briefcase, Palette, Scale, Database, LineChart, Globe } from "lucide-react";

const COURSES = [
  // Tech & CS
  { category: "Computer Science", name: "Data Structures & Algorithms", level: "Intermediate", lessons: 38, icon: Database },
  { category: "Computer Science", name: "Full-Stack Web Development", level: "Beginner", lessons: 45, icon: Globe },
  
  // Business
  { category: "Business & Management", name: "Financial Accounting Basics", level: "Beginner", lessons: 15, icon: LineChart },
  { category: "Business & Management", name: "Venture Strategy", level: "Advanced", lessons: 20, icon: Briefcase },
  
  // Design
  { category: "Arts & Design", name: "UI/UX Foundations", level: "Beginner", lessons: 22, icon: Palette },
  
  // Humanities / Law
  { category: "Law & Humanities", name: "Introduction to Corporate Law", level: "Intermediate", lessons: 25, icon: Scale },
];

const VIDEOS = [
  { title: "Intro to Algorithms — MIT OCW", id: "HtSuA80QTyo" },
  { title: "Financial Markets — Yale", id: "WEdrU4H2-aY" },
  { title: "Graphic Design Basics", id: "WONkVzBwDms" },
];

const DAILY_CHALLENGES = [
  {
    type: "Coding Practice",
    title: "Reverse a Linked List",
    difficulty: "Medium",
    points: "+50 XP",
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list. Optimize for O(1) space complexity.",
    button: "Solve Challenge"
  },
  {
    type: "Business Case Study",
    title: "Market Entry: Tech in LatAm",
    difficulty: "Hard",
    points: "+75 XP",
    description: "Analyze the risk factors and market entry strategy for a SaaS company expanding into the Latin American market.",
    button: "Read Case"
  },
  {
    type: "Design Prompt",
    title: "Eco-friendly Dashboard",
    difficulty: "Easy",
    points: "+30 XP",
    description: "Design a mobile dashboard tracking personal carbon footprint. Focus on green accent colors and data visualization.",
    button: "Submit Design"
  }
];

export default function Learn() {
  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto w-full space-y-10">
        
        <header>
          <div className="text-xs uppercase tracking-wider text-primary font-bold mb-2">Knowledge Base</div>
          <h1 className="text-3xl font-display font-bold text-foreground">Learn & Practice</h1>
          <p className="text-muted-foreground mt-2">Explore tailored courses and daily challenges across all majors.</p>
        </header>

        {/* Daily Challenges Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            Daily Challenges
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {DAILY_CHALLENGES.map((challenge, i) => (
              <div key={i} className="panel p-5 relative overflow-hidden group flex flex-col">
                <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-2 -translate-y-2">
                  <Code2 className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-sm">
                      {challenge.type}
                    </span>
                    <span className="text-xs font-bold text-success">{challenge.points}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{challenge.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{challenge.description}</p>
                </div>
                <button className="w-full h-9 rounded-md bg-foreground text-background text-sm font-bold mt-auto hover:bg-foreground/90 transition shadow-lg relative z-10">
                  {challenge.button}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Curated Modules</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COURSES.map((c) => (
              <div key={c.name} className="panel p-5 group hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-[hsl(var(--surface-3))] grid place-items-center">
                    <c.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">{c.category}</div>
                    <div className="text-xs bg-surface-2 inline-block px-1.5 py-0.5 rounded mt-1 font-mono">{c.level}</div>
                  </div>
                </div>
                <div className="text-base font-bold mb-1 group-hover:text-primary transition-colors">{c.name}</div>
                <div className="flex items-center justify-between mt-6">
                  <span className="text-xs text-muted-foreground font-medium">{c.lessons} lessons</span>
                  <button className="text-xs font-bold text-primary hover:underline">Start Track &rarr;</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Video Lectures Section */}
        <section>
          <h2 className="text-xl font-bold mb-4">Featured Lectures</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VIDEOS.map((v) => (
              <div key={v.id} className="panel overflow-hidden">
                <div className="aspect-video bg-black">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${v.id}`}
                    title={v.title}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 font-semibold text-sm line-clamp-1 hover:text-primary transition-colors cursor-default">
                  {v.title}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
