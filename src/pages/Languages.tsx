import { useState } from "react";
import { CheckCircle2, Circle, ChevronRight, Star, RotateCcw, Volume2 } from "lucide-react";

type Track = "german" | "french" | "ielts" | "sat";

const TRACKS = [
  { id: "german" as Track, flag: "🇩🇪", label: "German", sub: "Deutsch", color: "from-yellow-500/20 to-black/10", levels: ["A1 Basics", "A2 Survival", "B1 Conversational", "B2 Fluent"] },
  { id: "french" as Track, flag: "🇫🇷", label: "French", sub: "Français", color: "from-blue-500/20 to-red-500/20", levels: ["A1 Basics", "A2 Survival", "B1 Conversational", "B2 Fluent"] },
  { id: "ielts" as Track, flag: "🇬🇧", label: "IELTS Prep", sub: "Academic & General", color: "from-blue-600/20 to-cyan-500/20", levels: ["Listening", "Reading", "Writing", "Speaking"] },
  { id: "sat"  as Track, flag: "🇺🇸", label: "SAT Prep",  sub: "College Board", color: "from-red-500/20 to-blue-600/20", levels: ["Math: Algebra", "Math: Advanced", "Reading & Writing", "Full Practice Test"] },
];

const LESSONS: Record<Track, { title: string; type: string; xp: number; items: { q: string; a: string; choices?: string[] }[] }[]> = {
  german: [
    {
      title: "Greetings & Introductions",
      type: "Vocabulary",
      xp: 20,
      items: [
        { q: "How do you say 'Good morning' in German?", a: "Guten Morgen", choices: ["Guten Morgen", "Guten Tag", "Gute Nacht", "Hallo"] },
        { q: "What does 'Wie heißen Sie?' mean?", a: "What is your name?", choices: ["How are you?", "What is your name?", "Where are you from?", "How old are you?"] },
        { q: "'Ich komme aus Indien' means…", a: "I come from India", choices: ["I live in India", "I come from India", "I like India", "I visited India"] },
      ],
    },
    {
      title: "Numbers 1–20",
      type: "Vocabulary",
      xp: 20,
      items: [
        { q: "What is 'drei' in English?", a: "Three", choices: ["Two", "Three", "Four", "Five"] },
        { q: "'Zwölf' means…", a: "Twelve", choices: ["Ten", "Eleven", "Twelve", "Twenty"] },
        { q: "How do you say 'fifteen' in German?", a: "Fünfzehn", choices: ["Fünfzehn", "Sechzehn", "Vierzehn", "Dreizehn"] },
      ],
    },
    {
      title: "Basic Sentences",
      type: "Grammar",
      xp: 30,
      items: [
        { q: "Translate: 'I am a student.'", a: "Ich bin ein Student.", choices: ["Ich bin ein Student.", "Ich habe ein Student.", "Du bist ein Student.", "Er ist ein Student."] },
        { q: "What is the German word for 'to eat'?", a: "essen", choices: ["trinken", "schlafen", "essen", "laufen"] },
        { q: "'Wo wohnst du?' means…", a: "Where do you live?", choices: ["Where do you work?", "Where do you live?", "What do you do?", "When do you sleep?"] },
      ],
    },
    {
      title: "Colors & Objects",
      type: "Vocabulary",
      xp: 20,
      items: [
        { q: "How do you say 'blue' in German?", a: "Blau", choices: ["Rot", "Blau", "Grün", "Gelb"] },
        { q: "'Das Buch' means…", a: "The book", choices: ["The table", "The book", "The pen", "The chair"] },
        { q: "'Groß' means…", a: "Big / tall", choices: ["Small", "Fast", "Big / tall", "Old"] },
      ],
    },
  ],
  french: [
    {
      title: "Greetings & Basics",
      type: "Vocabulary",
      xp: 20,
      items: [
        { q: "How do you say 'Good evening' in French?", a: "Bonsoir", choices: ["Bonjour", "Bonsoir", "Salut", "Au revoir"] },
        { q: "'Comment vous appelez-vous?' means…", a: "What is your name?", choices: ["How are you?", "What is your name?", "Where do you live?", "How old are you?"] },
        { q: "Translate: 'Thank you very much'", a: "Merci beaucoup", choices: ["Merci beaucoup", "S'il vous plaît", "De rien", "Excusez-moi"] },
      ],
    },
    {
      title: "Numbers & Time",
      type: "Vocabulary",
      xp: 20,
      items: [
        { q: "What is 'sept' in English?", a: "Seven", choices: ["Six", "Seven", "Eight", "Nine"] },
        { q: "'Quelle heure est-il?' means…", a: "What time is it?", choices: ["What day is it?", "What time is it?", "What year is it?", "Where are you?"] },
        { q: "How do you say 'Monday' in French?", a: "Lundi", choices: ["Mardi", "Mercredi", "Lundi", "Jeudi"] },
      ],
    },
    {
      title: "Verbs: Être & Avoir",
      type: "Grammar",
      xp: 30,
      items: [
        { q: "Conjugate 'être' (to be) for 'I'", a: "Je suis", choices: ["Je suis", "J'ai", "Je vais", "Je fais"] },
        { q: "'Nous avons' means…", a: "We have", choices: ["We are", "We have", "We go", "We make"] },
        { q: "Translate: 'She is French.'", a: "Elle est française.", choices: ["Elle est française.", "Elle a française.", "Il est français.", "Elle va française."] },
      ],
    },
    {
      title: "Café & Food",
      type: "Vocabulary",
      xp: 20,
      items: [
        { q: "'Je voudrais un café' means…", a: "I would like a coffee", choices: ["I have a coffee", "I would like a coffee", "I like coffee", "Give me coffee"] },
        { q: "How do you say 'water' in French?", a: "Eau", choices: ["Lait", "Jus", "Eau", "Vin"] },
        { q: "'L'addition, s'il vous plaît' means…", a: "The bill, please", choices: ["The menu, please", "The bill, please", "More bread, please", "A table, please"] },
      ],
    },
  ],
  ielts: [
    {
      title: "Listening: Note Completion",
      type: "Listening",
      xp: 25,
      items: [
        { q: "In IELTS Listening, how many sections are there?", a: "4", choices: ["2", "3", "4", "5"] },
        { q: "The recording is played __ time(s).", a: "Once", choices: ["Once", "Twice", "Three times", "As many as needed"] },
        { q: "Which section is the most difficult in Listening?", a: "Section 4 (academic monologue)", choices: ["Section 1", "Section 2", "Section 3", "Section 4 (academic monologue)"] },
      ],
    },
    {
      title: "Reading: True / False / NG",
      type: "Reading",
      xp: 25,
      items: [
        { q: "What does 'Not Given' mean in IELTS Reading?", a: "The information is not in the passage", choices: ["The statement is false", "The writer doesn't say", "The information is not in the passage", "The statement is partially true"] },
        { q: "How many passages are in Academic IELTS Reading?", a: "3", choices: ["2", "3", "4", "5"] },
        { q: "Time allowed for the Reading section:", a: "60 minutes", choices: ["45 minutes", "60 minutes", "90 minutes", "30 minutes"] },
      ],
    },
    {
      title: "Writing: Task 2 Structure",
      type: "Writing",
      xp: 30,
      items: [
        { q: "Minimum word count for Task 2?", a: "250 words", choices: ["150 words", "200 words", "250 words", "300 words"] },
        { q: "Task 2 carries what proportion of the Writing score?", a: "Two-thirds", choices: ["Half", "Two-thirds", "One-third", "All of it"] },
        { q: "Which is NOT a Writing Task 2 question type?", a: "True / False / NG", choices: ["Opinion essay", "Discussion essay", "Problem–solution essay", "True / False / NG"] },
      ],
    },
    {
      title: "Speaking: Fluency Tips",
      type: "Speaking",
      xp: 25,
      items: [
        { q: "How long is the IELTS Speaking test?", a: "11–14 minutes", choices: ["5–7 minutes", "11–14 minutes", "20–25 minutes", "30 minutes"] },
        { q: "In Part 2, how long do you have to speak?", a: "1–2 minutes", choices: ["30 seconds", "1–2 minutes", "3–4 minutes", "5 minutes"] },
        { q: "Which criterion is NOT part of IELTS Speaking scoring?", a: "Vocabulary size test", choices: ["Fluency & coherence", "Lexical resource", "Grammatical range", "Vocabulary size test"] },
      ],
    },
  ],
  sat: [
    {
      title: "Math: Linear Equations",
      type: "Math",
      xp: 30,
      items: [
        { q: "Solve: 2x + 6 = 14", a: "x = 4", choices: ["x = 3", "x = 4", "x = 5", "x = 7"] },
        { q: "What is the slope of y = 3x − 7?", a: "3", choices: ["-7", "3", "7", "-3"] },
        { q: "If 4(x − 2) = 12, then x = ?", a: "5", choices: ["3", "4", "5", "6"] },
      ],
    },
    {
      title: "Math: Quadratics",
      type: "Math",
      xp: 30,
      items: [
        { q: "Factor: x² + 5x + 6", a: "(x+2)(x+3)", choices: ["(x+1)(x+6)", "(x+2)(x+3)", "(x−2)(x−3)", "(x+3)(x+2)"] },
        { q: "What are the roots of x² − 9 = 0?", a: "x = ±3", choices: ["x = 3 only", "x = ±3", "x = 9", "x = ±9"] },
        { q: "Vertex of y = (x−3)² + 4?", a: "(3, 4)", choices: ["(-3, 4)", "(3, -4)", "(3, 4)", "(-3, -4)"] },
      ],
    },
    {
      title: "Reading: Main Idea",
      type: "Reading & Writing",
      xp: 25,
      items: [
        { q: "The SAT Reading & Writing section has how many modules?", a: "2 adaptive modules", choices: ["1 module", "2 adaptive modules", "3 modules", "4 modules"] },
        { q: "Which question type asks you to pick the best evidence?", a: "Command of Evidence", choices: ["Words in Context", "Command of Evidence", "Rhetoric", "Information & Ideas"] },
        { q: "SAT total score range:", a: "400–1600", choices: ["200–800", "0–1600", "400–1600", "600–2400"] },
      ],
    },
    {
      title: "Writing: Grammar Rules",
      type: "Reading & Writing",
      xp: 25,
      items: [
        { q: "Identify the error: 'Each of the students have a book.'", a: "'have' should be 'has' (subject-verb agreement)", choices: ["'Each' should be 'All'", "'have' should be 'has' (subject-verb agreement)", "No error", "'students' should be singular"] },
        { q: "Which is the correct use of a semicolon?", a: "I studied hard; I passed the test.", choices: ["I studied; hard.", "I studied hard; I passed the test.", "I; studied hard.", "I studied hard, I; passed."] },
        { q: "What does a transition word like 'however' indicate?", a: "Contrast", choices: ["Addition", "Contrast", "Cause", "Example"] },
      ],
    },
  ],
};

// ─── QUIZ COMPONENT ───────────────────────────────────────────────────────────
function Quiz({ lesson, onDone }: { lesson: typeof LESSONS["german"][0]; onDone: (score: number) => void }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const item = lesson.items[idx];

  function pick(choice: string) {
    if (selected) return;
    setSelected(choice);
    if (choice === item.a) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= lesson.items.length) {
      setDone(true);
      onDone(score + (selected === item.a ? 1 : 0));
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  }

  if (done) {
    const final = score + (selected === item.a ? 1 : 0);
    return (
      <div className="panel p-8 text-center space-y-4 animate-in fade-in">
        <div className="text-5xl">{final === lesson.items.length ? "🎉" : final >= lesson.items.length / 2 ? "👍" : "📚"}</div>
        <div className="text-2xl font-bold">{final}/{lesson.items.length} correct</div>
        <div className="text-muted-foreground text-sm">+{Math.round((final / lesson.items.length) * lesson.xp)} XP earned</div>
        <button onClick={() => onDone(final)} className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
          Back to lessons
        </button>
      </div>
    );
  }

  return (
    <div className="panel p-6 space-y-5 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Question {idx + 1} of {lesson.items.length}</div>
        <div className="flex gap-1">
          {lesson.items.map((_, i) => (
            <div key={i} className={`h-1.5 w-8 rounded-full ${i < idx ? "bg-success" : i === idx ? "bg-primary" : "bg-[hsl(var(--surface-3))]"}`} />
          ))}
        </div>
      </div>
      <div className="text-lg font-semibold">{item.q}</div>
      <div className="grid grid-cols-1 gap-2">
        {(item.choices ?? [item.a]).map((c) => {
          const isCorrect = c === item.a;
          const isSelected = c === selected;
          let cls = "p-3 rounded-xl border text-sm text-left font-medium transition-all ";
          if (!selected) cls += "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer";
          else if (isCorrect) cls += "border-success bg-success/10 text-success";
          else if (isSelected) cls += "border-destructive bg-destructive/10 text-destructive";
          else cls += "border-border opacity-50";
          return (
            <button key={c} className={cls} onClick={() => pick(c)} disabled={!!selected}>
              {c}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="flex items-center justify-between animate-in fade-in">
          <div className={`text-sm font-semibold ${selected === item.a ? "text-success" : "text-destructive"}`}>
            {selected === item.a ? "✓ Correct!" : `✗ Answer: ${item.a}`}
          </div>
          <button onClick={next} className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            {idx + 1 >= lesson.items.length ? "Finish" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Languages() {
  const [track, setTrack] = useState<Track | null>(null);
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Record<string, number[]>>({});

  const trackLessons = track ? LESSONS[track] : [];
  const doneIds = track ? (completed[track] ?? []) : [];

  function finishLesson(lessonIdx: number, _score: number) {
    if (!track) return;
    setCompleted((prev) => ({
      ...prev,
      [track]: [...new Set([...(prev[track] ?? []), lessonIdx])],
    }));
    setActiveLesson(null);
  }

  // Track picker screen
  if (!track) {
    return (
      <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          <header>
            <div className="text-xs uppercase tracking-wider text-primary font-bold mb-2">Language Lab</div>
            <h1 className="text-3xl font-display font-bold">Languages & Exam Prep</h1>
            <p className="text-muted-foreground mt-1.5">Pick a track and start learning. Each lesson takes ~3 minutes.</p>
          </header>
          <div className="grid sm:grid-cols-2 gap-4">
            {TRACKS.map((t) => {
              const done = (completed[t.id] ?? []).length;
              const total = LESSONS[t.id].length;
              return (
                <button
                  key={t.id}
                  onClick={() => setTrack(t.id)}
                  className={`panel p-5 text-left bg-gradient-to-br ${t.color} hover:border-primary/50 transition-all group`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{t.flag}</span>
                    <div>
                      <div className="font-bold text-lg group-hover:text-primary transition-colors">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.sub}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {t.levels.map((l) => <span key={l} className="chip text-[10px] py-0.5">{l}</span>)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{done}/{total} lessons done</div>
                    <div className="w-24 h-1.5 bg-[hsl(var(--surface-3))] rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const trackInfo = TRACKS.find((t) => t.id === track)!;

  // Active lesson / quiz
  if (activeLesson !== null) {
    return (
      <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto w-full space-y-4">
          <button onClick={() => setActiveLesson(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            ← Back
          </button>
          <div className="text-lg font-bold">{trackLessons[activeLesson].title}</div>
          <Quiz lesson={trackLessons[activeLesson]} onDone={(s) => finishLesson(activeLesson, s)} />
        </div>
      </div>
    );
  }

  // Lesson list for selected track
  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setTrack(null)} className="text-sm text-muted-foreground hover:text-foreground">← All tracks</button>
        </div>
        <div className={`panel p-5 bg-gradient-to-br ${trackInfo.color}`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{trackInfo.flag}</span>
            <div>
              <div className="font-bold text-xl">{trackInfo.label}</div>
              <div className="text-sm text-muted-foreground">{doneIds.length}/{trackLessons.length} completed · {doneIds.reduce((a, i) => a + trackLessons[i].xp, 0)} XP</div>
            </div>
          </div>
          <div className="mt-3 h-2 bg-[hsl(var(--surface-3))] rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(doneIds.length / trackLessons.length) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          {trackLessons.map((lesson, i) => {
            const isDone = doneIds.includes(i);
            return (
              <button
                key={i}
                onClick={() => setActiveLesson(i)}
                className="w-full panel p-4 flex items-center gap-4 hover:border-primary/40 transition-all text-left group"
              >
                <div className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${isDone ? "bg-success/20 text-success" : "bg-primary/10 text-primary"}`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : <span className="font-bold text-sm">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm group-hover:text-primary transition-colors">{lesson.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{lesson.type} · {lesson.items.length} questions · +{lesson.xp} XP</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
