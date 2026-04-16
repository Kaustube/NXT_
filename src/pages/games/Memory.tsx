import { useEffect, useState } from "react";

const ICONS = ["A", "B", "C", "D", "E", "F", "G", "H"];

type Card = { id: number; v: string; flipped: boolean; matched: boolean };

function makeDeck(): Card[] {
  const arr = [...ICONS, ...ICONS]
    .map((v, i) => ({ id: i, v, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((c, i) => ({ ...c, id: i }));
  return arr;
}

export default function Memory() {
  const [deck, setDeck] = useState<Card[]>(makeDeck);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (picked.length !== 2) return;
    const [a, b] = picked;
    const same = deck[a].v === deck[b].v;
    setTimeout(() => {
      setDeck((d) => d.map((c, i) => (i === a || i === b) ? { ...c, matched: same, flipped: same } : c));
      setPicked([]);
      setMoves((m) => m + 1);
    }, same ? 300 : 700);
  }, [picked, deck]);

  function flip(i: number) {
    if (picked.length === 2 || deck[i].flipped || deck[i].matched) return;
    setDeck((d) => d.map((c, idx) => (idx === i ? { ...c, flipped: true } : c)));
    setPicked((p) => [...p, i]);
  }

  const won = deck.every((c) => c.matched);

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Memory</h1>
        <div className="text-sm text-muted-foreground">Moves: {moves}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {deck.map((c, i) => (
          <button
            key={c.id}
            onClick={() => flip(i)}
            className={`aspect-square rounded-md border text-xl font-semibold grid place-items-center transition ${
              c.flipped || c.matched
                ? c.matched ? "bg-success/20 border-success/40 text-foreground" : "bg-[hsl(var(--surface-3))] border-border"
                : "bg-[hsl(var(--surface-2))] border-border text-transparent hover:bg-[hsl(var(--surface-3))]"
            }`}
          >
            {c.flipped || c.matched ? c.v : "?"}
          </button>
        ))}
      </div>
      {won && (
        <div className="panel p-4 text-sm">
          Done in {moves} moves.
          <button onClick={() => { setDeck(makeDeck()); setMoves(0); setPicked([]); }} className="ml-3 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">Play again</button>
        </div>
      )}
    </div>
  );
}
