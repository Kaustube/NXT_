import { useEffect, useMemo, useState } from "react";

const WORDS = ["REACT", "BLAZE", "CHESS", "PRIME", "QUERY", "FLAME", "TIGER", "PLANT", "STORM", "BRAVE", "GLOBE", "MUSIC", "PIXEL", "STUDY", "CLOUD"];

export default function Wordle() {
  const [target, setTarget] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState<"won" | "lost" | null>(null);

  useEffect(() => { reset(); }, []);

  function reset() {
    setTarget(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuesses([]);
    setCurrent("");
    setDone(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.key === "Enter") {
        if (current.length === 5) {
          const g = current.toUpperCase();
          const next = [...guesses, g];
          setGuesses(next);
          setCurrent("");
          if (g === target) setDone("won");
          else if (next.length >= 6) setDone("lost");
        }
      } else if (e.key === "Backspace") {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key) && current.length < 5) {
        setCurrent((c) => c + e.key.toUpperCase());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, guesses, done, target]);

  const rows = useMemo(() => {
    const arr = [...guesses];
    if (!done) arr.push(current.padEnd(5, " "));
    while (arr.length < 6) arr.push("     ");
    return arr;
  }, [guesses, current, done]);

  function color(letter: string, i: number, isSubmitted: boolean) {
    if (!isSubmitted || letter === " ") return "bg-[hsl(var(--surface-2))] border-border";
    if (target[i] === letter) return "bg-success text-success-foreground border-transparent";
    if (target.includes(letter)) return "bg-primary/70 text-primary-foreground border-transparent";
    return "bg-[hsl(var(--surface-3))] text-muted-foreground border-transparent";
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="font-display text-3xl">Wordle</h1>
      <p className="text-sm text-muted-foreground">Type a 5-letter word and press Enter.</p>
      <div className="space-y-1.5">
        {rows.map((row, ri) => {
          const isSubmitted = ri < guesses.length;
          return (
            <div key={ri} className="grid grid-cols-5 gap-1.5">
              {row.split("").map((ch, i) => (
                <div key={i} className={`h-12 grid place-items-center font-semibold text-lg rounded-md border ${color(ch, i, isSubmitted)}`}>
                  {ch.trim()}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {done && (
        <div className="panel p-4 text-sm">
          {done === "won" ? "Got it." : `The word was ${target}.`}
          <button onClick={reset} className="ml-3 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">Play again</button>
        </div>
      )}
    </div>
  );
}
