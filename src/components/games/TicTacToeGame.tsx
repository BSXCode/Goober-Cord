"use client";

import { useState, useEffect } from "react";

type Cell = "X" | "O" | null;
type Board = Cell[];

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): "X" | "O" | "draw" | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((c) => c !== null)) return "draw";
  return null;
}

function getEmptyIndices(board: Board): number[] {
  return board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
}

function findWinningMove(board: Board, player: "X" | "O"): number | null {
  for (const [a, b, c] of WIN_LINES) {
    const vals = [board[a], board[b], board[c]];
    const mine = vals.filter((v) => v === player).length;
    const empty = vals.filter((v) => v === null).length;
    if (mine === 2 && empty === 1) {
      if (board[a] === null) return a;
      if (board[b] === null) return b;
      if (board[c] === null) return c;
    }
  }
  return null;
}

function cpuMove(board: Board): number {
  const win = findWinningMove(board, "O");
  if (win !== null) return win;
  const block = findWinningMove(board, "X");
  if (block !== null) return block;
  const empty = getEmptyIndices(board);
  if (empty.includes(4)) return 4;
  const corners = [0, 2, 6, 8].filter((i) => empty.includes(i));
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export function TicTacToeGame() {
  const [board, setBoard] = useState<Board>(() => Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<"X" | "O" | "draw" | null>(null);

  const gameOver = winner !== null;

  useEffect(() => {
    if (gameOver || isPlayerTurn) return;
    const timer = setTimeout(() => {
      const idx = cpuMove(board);
      const next = [...board] as Board;
      next[idx] = "O";
      setBoard(next);
      const w = checkWinner(next);
      setWinner(w);
      setIsPlayerTurn(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [board, isPlayerTurn, gameOver]);

  const handleCellClick = (i: number) => {
    if (board[i] !== null || !isPlayerTurn || gameOver) return;
    const next = [...board] as Board;
    next[i] = "X";
    setBoard(next);
    const w = checkWinner(next);
    setWinner(w);
    if (!w) setIsPlayerTurn(false);
  };

  const restart = () => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setWinner(null);
  };

  const status = () => {
    if (winner === "X") return "You win!";
    if (winner === "O") return "CPU wins!";
    if (winner === "draw") return "Draw!";
    return isPlayerTurn ? "Your turn (X)" : "CPU thinking...";
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-[#1e1f22] rounded-lg">
      <p className="text-[#dbdee1] text-sm font-medium">{status()}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCellClick(i)}
            disabled={cell !== null || !isPlayerTurn || gameOver}
            className="w-20 h-20 flex items-center justify-center rounded-lg bg-[#2b2d31] text-2xl font-bold disabled:cursor-default disabled:opacity-100 hover:bg-[#3f4147] disabled:hover:bg-[#2b2d31] border border-[#3f4147] transition-colors"
          >
            {cell === "X" && <span className="text-[#5865f2]">X</span>}
            {cell === "O" && <span className="text-[#ed4245]">O</span>}
          </button>
        ))}
      </div>
      {(winner === "X" || winner === "O" || winner === "draw") && (
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
