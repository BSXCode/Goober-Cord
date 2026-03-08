"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = mode === "signup" ? await signUp(username, password) : await login(username, password);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
      }
    } catch {
      setError("Connection failed. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#313338] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#2b2d31] rounded-xl shadow-xl p-8 border border-[#3f4147]">
          <h1 className="text-2xl font-bold text-center text-white mb-1">
            Goober-Cord
          </h1>
          <p className="text-[#b5bac1] text-center text-sm mb-6">
            {mode === "signup"
              ? "Create an account — no email required."
              : "Welcome back! We're glad to see you."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 rounded bg-[#1e1f22] border border-[#3f4147]",
                  "text-white placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none focus:ring-0"
                )}
                placeholder="Enter your username"
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#b5bac1] uppercase tracking-wide mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 rounded bg-[#1e1f22] border border-[#3f4147]",
                  "text-white placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none focus:ring-0"
                )}
                placeholder="Enter your password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-2.5 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium transition-colors",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? "Connecting..." : mode === "signup" ? "Sign up" : "Log in"}
            </button>
          </form>

          <p className="mt-4 text-sm text-[#b5bac1] text-center">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-[#00a8fc] hover:underline"
                  disabled={loading}
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Need an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); }}
                  className="text-[#00a8fc] hover:underline"
                  disabled={loading}
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-[#4e5058]">
          Goober-Cord — real-time multiplayer chat
        </p>
      </div>
    </div>
  );
}
