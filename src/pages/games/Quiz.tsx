import { useState } from "react";

const QUESTIONS = [
  { q: "What does HTTP stand for?", o: ["Hyper Text Transfer Protocol", "High Transfer Text Protocol", "Hyperlink Transfer Process", "Host Transfer Tunneling"], a: 0 },
  { q: "Which data structure uses LIFO?", o: ["Queue", "Stack", "Tree", "Graph"], a: 1 },
  { q: "Big-O of binary search?", o: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], a: 2 },
  { q: "Which is NOT a JS framework/library?", o: ["React", "Vue", "Laravel", "Svelte"], a: 2 },
  { q: "SQL keyword to remove rows?", o: ["DROP", "DELETE", "REMOVE", "ERASE"], a: 1 },
  { q: "OSI layer for routing?", o: ["Transport", "Network", "Session", "Data Link"], a: 1 },
  { q: "Which company makes the Linux kernel?", o: ["Microsoft", "Red Hat", "Linus Torvalds + community", "Google"], a: 2 },
  { q: "Default React state hook?", o: ["useEffect", "useReducer", "useState", "useRef"], a: 2 },
  { q: "TCP is…", o: ["Connectionless", "Connection-oriented", "Stateless protocol", "Encryption layer"], a: 1 },
  { q: "Which is NoSQL?", o: ["PostgreSQL", "MySQL", "MongoDB", "SQLite"], a: 2 },
];

export default function Quiz() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        <h1 className="font-display text-3xl">Done.</h1>
        <p className="text-sm text-muted-foreground">You scored {score} / {QUESTIONS.length}.</p>
        <button onClick={() => { setI(0); setScore(0); setPicked(null); setDone(false); }} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Try again</button>
      </div>
    );
  }

  const q = QUESTIONS[i];
  function pick(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === q.a) setScore((s) => s + 1);
    setTimeout(() => {
      if (i + 1 >= QUESTIONS.length) setDone(true);
      else { setI(i + 1); setPicked(null); }
    }, 600);
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <div className="text-xs text-muted-foreground">Question {i + 1} / {QUESTIONS.length}</div>
      <h1 className="text-xl font-medium">{q.q}</h1>
      <div className="space-y-2">
        {q.o.map((opt, idx) => {
          const isPicked = picked === idx;
          const isCorrect = picked !== null && idx === q.a;
          const isWrong = isPicked && idx !== q.a;
          return (
            <button
              key={idx}
              onClick={() => pick(idx)}
              className={`w-full text-left px-3 py-2.5 rounded-md border text-sm transition ${
                isCorrect ? "bg-success/20 border-success/40" : isWrong ? "bg-destructive/20 border-destructive/40" : "border-border hover:bg-[hsl(var(--surface-2))]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground">Score: {score}</div>
    </div>
  );
}
