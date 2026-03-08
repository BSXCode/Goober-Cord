"use client";

import { useState, useEffect, useCallback } from "react";

const WORDS = [
  "about", "above", "abuse", "actor", "acute", "admit", "adopt", "adult", "after", "again",
  "agent", "agree", "ahead", "alarm", "album", "alert", "align", "alive", "allow", "alone",
  "along", "alter", "among", "anger", "angle", "angry", "apart", "apple", "apply", "arena",
  "argue", "arise", "array", "aside", "asset", "avoid", "award", "aware", "badly", "baker",
  "bases", "basic", "basis", "beach", "began", "begin", "begun", "being", "below", "bench",
  "billy", "birth", "black", "blade", "blame", "blank", "blast", "blend", "bless", "blind",
  "block", "blood", "board", "boost", "booth", "bound", "brain", "brand", "brass", "brave",
  "bread", "break", "breed", "bride", "brief", "bring", "broad", "broke", "brown", "build",
  "built", "burst", "buyer", "cable", "calif", "carry", "catch", "cause", "chain", "chair",
  "chart", "chase", "cheap", "check", "chest", "chief", "child", "china", "chose", "civil",
  "claim", "class", "clean", "clear", "click", "clock", "close", "coach", "coast", "colon",
  "color", "comic", "creek", "crack", "craft", "crash", "cream", "crime", "cross", "crowd",
  "crown", "curve", "cycle", "daily", "dance", "david", "dealt", "death", "delay", "delta",
  "draft", "drama", "drawn", "dream", "dress", "drink", "drive", "drove", "early", "earth",
  "eight", "elite", "empty", "enemy", "enjoy", "enter", "entry", "equal", "error", "event",
  "every", "exact", "exist", "extra", "faith", "false", "fault", "favor", "fiber", "field",
  "fifth", "fifty", "fight", "final", "first", "fixed", "flash", "fleet", "floor", "fluid",
  "focus", "force", "forth", "forty", "forum", "found", "frame", "frank", "fresh", "front",
  "fruit", "fully", "genre", "ghost", "giant", "given", "glass", "globe", "going", "grace",
];

type LetterStatus = "correct" | "present" | "absent" | null;

function getFeedback(guess: string, target: string): LetterStatus[] {
  const arr: LetterStatus[] = [];
  const remaining = target.split("");
  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) {
      arr.push("correct");
      remaining[i] = "";
    } else {
      arr.push(null);
    }
  }
  for (let i = 0; i < 5; i++) {
    if (arr[i]) continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx !== -1) {
      arr[i] = "present";
      remaining[idx] = "";
    } else {
      arr[i] = "absent";
    }
  }
  return arr;
}

function pickWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export function WordleGame() {
  const [target, setTarget] = useState(pickWord);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [keyStatus, setKeyStatus] = useState<Record<string, LetterStatus>>({});

  const won = guesses.includes(target);
  const lost = !won && guesses.length >= 6;
  const playing = !won && !lost;

  const submitGuess = useCallback(() => {
    if (current.length !== 5) return;
    const guess = current.toLowerCase();
    setGuesses((g) => [...g, guess]);
    setCurrent("");
    const feedback = getFeedback(guess, target);
    setKeyStatus((k) => {
      const next = { ...k };
      for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const status = feedback[i];
        const prev = next[letter];
        if (!prev || status === "correct" || (status === "present" && prev !== "correct")) {
          next[letter] = status;
        }
      }
      return next;
    });
  }, [current, target]);

  const restart = useCallback(() => {
    setTarget(pickWord());
    setGuesses([]);
    setCurrent("");
    setKeyStatus({});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!playing) return;
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        submitGuess();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key) && current.length < 5) {
        e.preventDefault();
        e.stopPropagation();
        setCurrent((c) => c + e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playing, current.length, submitGuess]);

  const keyStyle = (letter: string) => {
    const s = keyStatus[letter];
    if (!s) return "bg-[#2b2d31] text-[#dbdee1]";
    if (s === "correct") return "bg-[#3a7d44] text-white";
    if (s === "present") return "bg-[#b59f3b] text-white";
    return "bg-[#3f4147] text-[#6d6f73]";
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-[#1e1f22] rounded-lg">
      {playing && (
        <p className="text-[#dbdee1] text-sm">
          Guess the 5-letter word ({guesses.length}/6)
        </p>
      )}
      {won && (
        <p className="text-[#57F287] font-semibold">You won!</p>
      )}
      {lost && (
        <p className="text-[#ed4245] font-semibold">The word was: {target}</p>
      )}
      {(won || lost) && (
        <button
          type="button"
          onClick={restart}
          className="px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-medium"
        >
          Play Again
        </button>
      )}
      <div className="flex flex-col gap-1">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex gap-1 justify-center">
            {[0, 1, 2, 3, 4].map((col) => {
              const idx = row * 5 + col;
              const guess = guesses[row];
              const letter = guess?.[col] ?? (row === guesses.length ? current[col] ?? "" : "");
              const feedback = guess ? getFeedback(guess, target)[col] : null;
              let bg = "bg-[#2b2d31]";
              if (feedback === "correct") bg = "bg-[#3a7d44]";
              else if (feedback === "present") bg = "bg-[#b59f3b]";
              else if (feedback === "absent") bg = "bg-[#3f4147]";
              return (
                <div
                  key={col}
                  className={`w-12 h-12 flex items-center justify-center rounded font-bold text-lg text-[#dbdee1] border border-[#3f4147] ${bg}`}
                >
                  {letter.toUpperCase()}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {ROWS.map((row) => (
          <div key={row} className="flex gap-1 justify-center">
            {row.split("").map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => {
                  if (playing && current.length < 5) setCurrent((c) => c + letter);
                }}
                className={`w-8 h-10 rounded font-medium text-sm ${keyStyle(letter)}`}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1">
          <button
            type="button"
            onClick={submitGuess}
            disabled={current.length !== 5 || !playing}
            className="px-6 h-10 rounded font-medium text-sm bg-[#5865F2] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enter
          </button>
          <button
            type="button"
            onClick={() => setCurrent((c) => c.slice(0, -1))}
            disabled={!current.length || !playing}
            className="px-4 h-10 rounded font-medium text-sm bg-[#2b2d31] text-[#dbdee1] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  );
}
