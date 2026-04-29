import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, User, Cpu } from "lucide-react";
import BackButton from "@/components/BackButton";

type Piece = {
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: 'white' | 'black';
};

type Square = Piece | null;
type Board = Square[][];

const PIECE_SYMBOLS = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Black pieces
  board[0] = [
    { type: 'rook', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'rook', color: 'black' },
  ];
  board[1] = Array(8).fill({ type: 'pawn', color: 'black' });
  
  // White pieces
  board[6] = Array(8).fill({ type: 'pawn', color: 'white' });
  board[7] = [
    { type: 'rook', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'rook', color: 'white' },
  ];
  
  return board;
}

export default function Chess() {
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
  const [vsComputer, setVsComputer] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  function handleSquareClick(row: number, col: number) {
    if (!gameStarted) return;

    const piece = board[row][col];
    
    if (selectedSquare) {
      // Try to move
      const [fromRow, fromCol] = selectedSquare;
      const movingPiece = board[fromRow][fromCol];
      
      if (movingPiece && movingPiece.color === currentTurn) {
        // Simple move (no validation for now - just basic movement)
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = movingPiece;
        newBoard[fromRow][fromCol] = null;
        setBoard(newBoard);
        setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
        
        // If vs computer and now black's turn, make random move
        if (vsComputer && currentTurn === 'white') {
          setTimeout(() => makeComputerMove(newBoard), 500);
        }
      }
      
      setSelectedSquare(null);
    } else if (piece && piece.color === currentTurn) {
      // Select piece
      setSelectedSquare([row, col]);
    }
  }

  function makeComputerMove(currentBoard: Board) {
    // Simple AI: Find all black pieces and make a random valid move
    const blackPieces: [number, number][] = [];
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (currentBoard[r][c]?.color === 'black') {
          blackPieces.push([r, c]);
        }
      }
    }
    
    if (blackPieces.length === 0) return;
    
    // Pick random piece
    const [fromRow, fromCol] = blackPieces[Math.floor(Math.random() * blackPieces.length)];
    const piece = currentBoard[fromRow][fromCol];
    
    // Find valid moves (simplified - just move forward for pawns, random for others)
    const possibleMoves: [number, number][] = [];
    
    if (piece?.type === 'pawn') {
      if (fromRow < 7 && !currentBoard[fromRow + 1][fromCol]) {
        possibleMoves.push([fromRow + 1, fromCol]);
      }
    } else {
      // For other pieces, try random adjacent squares
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const newRow = fromRow + dr;
          const newCol = fromCol + dc;
          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            if (!currentBoard[newRow][newCol] || currentBoard[newRow][newCol]?.color === 'white') {
              possibleMoves.push([newRow, newCol]);
            }
          }
        }
      }
    }
    
    if (possibleMoves.length > 0) {
      const [toRow, toCol] = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      const newBoard = currentBoard.map(r => [...r]);
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = null;
      setBoard(newBoard);
      setCurrentTurn('white');
    }
  }

  function resetGame() {
    setBoard(createInitialBoard());
    setSelectedSquare(null);
    setCurrentTurn('white');
    setGameStarted(false);
  }

  function startGame(computer: boolean) {
    setVsComputer(computer);
    setGameStarted(true);
    resetGame();
    setGameStarted(true);
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <BackButton to="/games" label="Back to Games" />
          
          <div className="panel p-8 text-center space-y-6">
            <div className="text-6xl">♔</div>
            <h1 className="text-3xl font-bold">Chess</h1>
            <p className="text-muted-foreground">Choose your opponent</p>
            
            <div className="space-y-3">
              <button
                onClick={() => startGame(false)}
                className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-all hover:scale-105"
              >
                <User className="h-5 w-5" />
                Play with Friend
              </button>
              
              <button
                onClick={() => startGame(true)}
                className="w-full h-14 rounded-xl border-2 border-primary text-primary font-bold text-lg flex items-center justify-center gap-3 hover:bg-primary/10 transition-all hover:scale-105"
              >
                <Cpu className="h-5 w-5" />
                Play with Computer
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {vsComputer ? 'Simple AI opponent' : 'Pass and play on same device'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <BackButton to="/games" label="Back to Games" />
          
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg font-semibold ${
              currentTurn === 'white' 
                ? 'bg-white text-black' 
                : 'bg-black text-white'
            }`}>
              {currentTurn === 'white' ? '♔ White' : '♚ Black'}'s Turn
            </div>
            
            <button
              onClick={resetGame}
              className="h-10 w-10 rounded-lg border border-border grid place-items-center hover:bg-[hsl(var(--surface-2))] transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="panel p-6">
          <div className="aspect-square max-w-2xl mx-auto">
            <div className="grid grid-cols-8 gap-0 border-4 border-border rounded-lg overflow-hidden shadow-2xl">
              {board.map((row, rowIndex) =>
                row.map((square, colIndex) => {
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selectedSquare?.[0] === rowIndex && selectedSquare?.[1] === colIndex;
                  
                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      className={`aspect-square flex items-center justify-center text-4xl md:text-5xl transition-all hover:scale-105 ${
                        isLight ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-amber-800 dark:bg-amber-950'
                      } ${
                        isSelected ? 'ring-4 ring-primary ring-inset' : ''
                      }`}
                      style={{
                        boxShadow: isSelected ? '0 0 20px hsl(var(--primary))' : 'none',
                      }}
                    >
                      {square && PIECE_SYMBOLS[square.color][square.type]}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {vsComputer ? '🤖 Playing against Computer' : '👥 Playing with Friend'}
            </p>
            <p className="text-xs text-muted-foreground">
              Click a piece to select, then click a square to move
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
