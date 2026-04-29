import { Link } from "react-router-dom";

const GAMES = [
  { slug: "wordle", name: "Wordle", desc: "Guess the five-letter word in six tries." },
  { slug: "tictactoe", name: "Tic Tac Toe", desc: "Two players, one grid." },
  { slug: "quiz", name: "Quick Quiz", desc: "Ten general knowledge questions, no time pressure." },
  { slug: "memory", name: "Memory", desc: "Match pairs in as few flips as possible." },
  { slug: "chess", name: "Chess", desc: "Classic chess - play with friend or computer." },
];

export default function Games() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Games</div>
        <h1 className="font-display text-4xl mt-1">A quick break</h1>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {GAMES.map((g) => (
          <Link key={g.slug} to={`/games/${g.slug}`} className="panel p-5 hover:bg-[hsl(var(--surface-2))] transition group">
            <div className="text-base font-medium">{g.name}</div>
            <div className="text-sm text-muted-foreground mt-1">{g.desc}</div>
            <div className="text-xs text-primary mt-4 group-hover:translate-x-0.5 transition">Play →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
