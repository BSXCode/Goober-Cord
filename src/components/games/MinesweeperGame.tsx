"use client";

import { useState, useEffect, useCallback } from "react";

const SIZE = 9;
const MINES = 10;
const NUM_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#22c55e",
  3: "#ef4444",
  4: "#a855f7",
  5: "#7f1d1d",
  6: "#0d9488",
  7: "#000000",
  8: "#6b7280",
};

type CellState = "hidden" | "revealed" | "flagged";

interface Cell {
  isMine: boolean;
  adjacent: number;
  state: CellState;
}

function initBoard(firstClick?: number): { board: Cell[][]; mines: Set<string> } {
  const mines = new Set<string>();
  const positions: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      positions.push([r, c]);
    }
  }
  const exclude = new Set<number>();
  if (firstClick !== undefined) {
    const clickR = Math.floor(firstClick / SIZE);
    const clickC = firstClick % SIZE;
    exclude.add(firstClick);
    for (const [r, c] of getNeighbors(clickR, clickC)) exclude.add(r * SIZE + c);
  }
  const pool = positions.filter(([r, c]) => !exclude.has(r * SIZE + c));
  for (let i = 0; i < MINES && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [r, c] = pool[idx];
    pool.splice(idx, 1);
    mines.add(`${r},${c}`);
  }
  const board: Cell[][] = [];
  for (let r = 0; r < SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < SIZE; c++) {
      const isMine = mines.has(`${r},${c}`);
      let adjacent = 0;
      if (!isMine) {
        for (const [nr, nc] of getNeighbors(r, c)) {
          if (mines.has(`${nr},${nc}`)) adjacent++;
        }
      }
      row.push({ isMine, adjacent, state: "hidden" });
    }
    board.push(row);
  }
  return { board, mines };
}

function getNeighbors(r: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push([nr, nc]);
    }
  }
  return out;
}

function revealAll(board: Cell[][]): Cell[][] {
  return board.map((row) =>
    row.map((cell) => ({ ...cell, state: "revealed" as CellState }))
  );
}

export function MinesweeperGame() {
  const [board, setBoard] = useState<Cell[][]>(() => initBoard().board);
  const [flagsLeft, setFlagsLeft] = useState(MINES);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState<"win" | "lose" | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized || gameOver) return;
    const id = setInterval(() => setElapsed(Date.now() - (startTime ?? Date.now())), 100);
    return () => clearInterval(id);
  }, [initialized, gameOver, startTime]);

  const floodReveal = useCallback((r: number, c: number, b: Cell[][]) => {
    const next = b.map((row) => row.map((cell) => ({ ...cell })));
    const q: [number, number][] = [[r, c]];
    while (q.length) {
      const [cr, cc] = q.shift()!;
      if (cr < 0 || cr >= SIZE || cc < 0 || cc >= SIZE) continue;
      const cell = next[cr][cc];
      if (cell.state !== "hidden" || cell.isMine) continue;
      cell.state = "revealed";
      if (cell.adjacent === 0) {
        for (const [nr, nc] of getNeighbors(cr, cc)) q.push([nr, nc]);
      }
    }
    return next;
  }, []);

  const handleLeftClick = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const cell = board[r][c];
      if (cell.state !== "hidden") return;
      if (!initialized) {
        const { board: newBoard } = initBoard(r * SIZE + c);
        setBoard(floodReveal(r, c, newBoard));
        setStartTime(Date.now());
        setInitialized(true);
      } else if (cell.isMine) {
        setBoard(revealAll(board));
        setGameOver("lose");
      } else {
        setBoard(floodReveal(r, c, board));
      }
    },
    [board, gameOver, initialized, floodReveal]
  );

  const handleRightClick = useCallback(
    (e: React.MouseEvent, r: number, c: number) => {
      e.preventDefault();
      if (gameOver) return;
      const cell = board[r][c];
      if (cell.state !== "hidden" && cell.state !== "flagged") return;
      const next = board.map((row) => row.map((c) => ({ ...c })));
      const target = next[r][c];
      if (target.state === "flagged") {
        target.state = "hidden";
        setFlagsLeft((f) => f + 1);
      } else if (flagsLeft > 0) {
        target.state = "flagged";
        setFlagsLeft((f) => f - 1);
      }
      setBoard(next);
    },
    [board, gameOver, flagsLeft]
  );

  useEffect(() => {
    if (!initialized || gameOver) return;
    let revealed = 0;
    let mines = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell.state === "revealed") revealed++;
        if (cell.isMine) mines++;
      }
    }
    if (revealed === SIZE * SIZE - mines) {
      setBoard(revealAll(board));
      setGameOver("win");
    }
  }, [board, initialized, gameOver]);

  const restart = useCallback(() => {
    setBoard(initBoard().board);
    setFlagsLeft(MINES);
    setStartTime(null);
    setElapsed(0);
    setGameOver(null);
    setInitialized(false);
  }, []);

  const formatTime = (ms: number) => Math.floor(ms / 1000).toString().padStart(3, "0");

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-[#1e1f22] rounded-lg">
      <div className="flex items-center justify-between w-full max-w-[288px]">
        <span className="text-[#dbdee1] text-sm font-mono">{formatTime(elapsed)}</span>
        <span className="text-[#dbdee1] text-sm font-mono">💣 {flagsLeft}</span>
      </div>
      {gameOver === "win" && (
        <p className="text-[#57F287] font-semibold text-sm">You won!</p>
      )}
      {gameOver === "lose" && (
        <p className="text-[#ed4245] font-semibold text-sm">Game over!</p>
      )}
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${SIZE}, 28px)` }}>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => handleLeftClick(r, c)}
              onContextMenu={(e) => handleRightClick(e, r, c)}
              className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded border border-[#3f4147] transition-colors"
              style={{
                backgroundColor: cell.state === "revealed" ? "#1a1b1e" : "#2b2d31",
                color: cell.state === "revealed" && cell.adjacent > 0 ? NUM_COLORS[cell.adjacent] : "#dbdee1",
              }}
            >
              {cell.state === "flagged" && "🚩"}
              {cell.state === "revealed" && cell.isMine && "💣"}
              {cell.state === "revealed" && !cell.isMine && cell.adjacent > 0 && cell.adjacent}
            </button>
          ))
        )}
      </div>
      {(gameOver === "win" || gameOver === "lose") && (
        <button
          type="button"
          onClick={restart}
          className="px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-medium"
        >
          Restart
        </button>
      )}
    </div>
  );
}
