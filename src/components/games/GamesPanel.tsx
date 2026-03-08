"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Gamepad2, Maximize2, Minimize2 } from "lucide-react";
import { SnakeGame } from "./SnakeGame";
import { WordleGame } from "./WordleGame";
import { TicTacToeGame } from "./TicTacToeGame";
import { MinesweeperGame } from "./MinesweeperGame";

type Tab =
  | "snake"
  | "wordle"
  | "tictactoe"
  | "minesweeper"
  | "2048"
  | "doom"
  | "nzp"
  | "minecraft"
  | "fnaf1";

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: "snake", label: "Snake" },
  { id: "wordle", label: "Wordle" },
  { id: "tictactoe", label: "Tic-Tac-Toe" },
  { id: "minesweeper", label: "Minesweeper" },
  { id: "2048", label: "Hextris" },
  { id: "doom", label: "DOOM" },
  { id: "nzp", label: "NZP Zombies" },
  { id: "minecraft", label: "Minecraft" },
  { id: "fnaf1", label: "FNAF 1" },
];

export function GamesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("snake");
  const [fullscreen, setFullscreen] = useState(false);

  if (!open) return null;

  const panel = (
    <div
      className={`fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm ${
        fullscreen ? "p-0" : "items-center justify-center p-4"
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-[#1e1f22] overflow-hidden flex flex-col border border-[#2b2d31] ${
          fullscreen
            ? "flex-1 min-h-0 w-full max-w-none rounded-none"
            : "rounded-2xl shadow-2xl w-full max-w-3xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b2d31]">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[#dbdee1]" />
            <h2 className="text-lg font-semibold text-[#dbdee1]">Games</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 rounded-full text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#2b2d31] transition-colors"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#2b2d31] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex border-b border-[#2b2d31] overflow-x-auto">
          {TAB_CONFIG.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === id
                  ? "text-[#dbdee1] border-b-2 border-[#5865F2] bg-[#2b2d31]/50"
                  : "text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#2b2d31]/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className={`p-4 bg-[#1e1f22] flex items-center justify-center ${
            fullscreen ? "flex-1 min-h-0" : "min-h-[400px]"
          }`}
        >
          {tab === "snake" && <SnakeGame />}
          {tab === "wordle" && <WordleGame />}
          {tab === "tictactoe" && <TicTacToeGame />}
          {tab === "minesweeper" && <MinesweeperGame />}
          {tab === "2048" && (
            <iframe
              src="https://hextris.io/"
              className="w-full h-full min-h-[400px] rounded-lg border border-[#2b2d31]"
              title="Hextris"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {tab === "doom" && (
            <iframe
              src="https://archive.org/embed/doom_20221019"
              className="w-full h-full min-h-[400px] rounded-lg border border-[#2b2d31]"
              title="THE ULTIMATE DOOM (1993)"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {tab === "nzp" && (
            <iframe
              src="https://nzp.gay"
              className="w-full h-full min-h-[400px] rounded-lg border border-[#2b2d31]"
              title="NZ: Portable"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {tab === "minecraft" && (
            <iframe
              src="https://eaglercraft.com/play/?version=1.8.8-wasm"
              className="w-full h-full min-h-[400px] rounded-lg border border-[#2b2d31]"
              title="Minecraft (EaglercraftX 1.8.8)"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {tab === "fnaf1" && (
            <iframe
              src="https://sussygamedeveloper.github.io/FNAF1/"
              className="w-full h-full min-h-[400px] rounded-lg border border-[#2b2d31]"
              title="Five Nights at Freddy's 1 (HTML5)"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
