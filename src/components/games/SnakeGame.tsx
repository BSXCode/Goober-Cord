"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const COLS = 15;
const ROWS = 15;
const CELL = 20;
const INITIAL_SNAKE = [
  { x: 7, y: 7 },
  { x: 6, y: 7 },
  { x: 5, y: 7 },
];
const INITIAL_DIR = { dx: 1, dy: 0 };

type Dir = { dx: number; dy: number };

function randomFood(snake: { x: number; y: number }[]): { x: number; y: number } {
  let food: { x: number; y: number } = { x: 0, y: 0 };
  do {
    food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
  return food;
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<{ x: number; y: number }[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<{ x: number; y: number }>(() => randomFood(INITIAL_SNAKE));
  const [dir, setDir] = useState<Dir>(INITIAL_DIR);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);

  const restart = useCallback(() => {
    const init = [...INITIAL_SNAKE];
    setSnake(init);
    setFood(randomFood(init));
    setDir(INITIAL_DIR);
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const keyMap: Record<string, Dir> = {
        ArrowUp: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
        ArrowLeft: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
      };
      const next = keyMap[e.key];
      if (next) {
        e.preventDefault();
        setDir((d) => {
          if (d.dx === -next.dx && d.dy === -next.dy) return d;
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!running || gameOver) return;
    const interval = setInterval(() => {
      setSnake((s) => {
        const head = s[0];
        const next = { x: (head.x + dir.dx + COLS) % COLS, y: (head.y + dir.dy + ROWS) % ROWS };
        if (s.slice(1).some((c) => c.x === next.x && c.y === next.y)) {
          setGameOver(true);
          setRunning(false);
          return s;
        }
        const ate = next.x === food.x && next.y === food.y;
        if (ate) {
          setScore((sc) => sc + 1);
          setFood((f) => {
            const newSnake = [next, ...s];
            return randomFood(newSnake);
          });
        }
        const newSnake = [next, ...s];
        if (!ate) newSnake.pop();
        return newSnake;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [running, gameOver, dir, food]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1e1f22";
    ctx.fillRect(0, 0, 300, 300);
    snake.forEach((cell, i) => {
      ctx.fillStyle = i === 0 ? "#57F287" : "#43b581";
      ctx.fillRect(cell.x * CELL + 1, cell.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.fillStyle = "#ed4245";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }, [snake, food]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-between w-[300px]">
        <span className="text-[#dbdee1] font-semibold text-sm">Score: {score}</span>
        {(gameOver || !running) && (
          <button
            type="button"
            onClick={restart}
            className="px-3 py-1 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-medium"
          >
            {gameOver ? "Restart" : "Start"}
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="rounded-lg border border-[#2b2d31] bg-[#1e1f22]"
        tabIndex={0}
      />
      {gameOver && <p className="text-[#ed4245] text-sm font-medium">Game Over</p>}
    </div>
  );
}
