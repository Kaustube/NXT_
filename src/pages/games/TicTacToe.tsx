import { useState } from "react";

type Cell = "X" | "O" | null;

function winner(b: Cell[]): Cell | "draw" | null {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b1,c] of lines) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  if (b.every(Boolean)) return "draw";
  return null;
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const w = winner(board);

  function play(i: number) {
    if (board[i] || w) return;
    const next = [...board];
    next[i] = turn;
    setBoard(next);
    setTurn(turn === "X" ? "O" : "X");
  }

  function reset() { setBoard(Array(9).fill(null)); setTurn("X"); }

  return (
    <div className="p-6 max-w-sm mx-auto space-y-4">
      <h1 className="font-display text-3xl">Tic Tac Toe</h1>
      <div className="text-sm text-muted-foreground">
        {w === "draw" ? "Draw." : w ? `${w} wins.` : `${turn} to move.`}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {board.map((c, i) => (
          <button key={i} onClick={() => play(i)} className="aspect-square panel-2 grid place-items-center text-3xl font-semibold hover:bg-[hsl(var(--surface-3))]">
            {c}
          </button>
        ))}
      </div>
      <button onClick={reset} className="h-9 px-3 rounded-md border border-border text-sm">Reset</button>
    </div>
  );
}
