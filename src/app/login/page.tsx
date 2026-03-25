"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // オープンリダイレクト防止: 内部パスのみ許可
  const rawRedirect = searchParams.get("redirect") || "/";
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "蒼さん、おはようございます";
    if (hour >= 11 && hour < 17) return "蒼さん、こんにちは";
    if (hour >= 17 && hour < 23) return "蒼さん、おかえりなさい";
    return "蒼さん、夜更かしですね";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }

      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setUsername("");
      setPassword("");
      setShakeForm(true);
      window.setTimeout(() => setShakeForm(false), 420);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="pointer-events-none absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.28),transparent_40%),radial-gradient(circle_at_85%_30%,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(6,182,212,0.2),transparent_40%)] [animation-duration:7s]" />
      <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="pointer-events-none absolute -left-20 top-20 h-56 w-56 animate-pulse rounded-full bg-cyan-400/20 blur-3xl [animation-duration:5s]" />
      <div className="pointer-events-none absolute -right-16 bottom-16 h-56 w-56 animate-pulse rounded-full bg-blue-500/25 blur-3xl [animation-duration:6s]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* ロゴ */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
            <svg
              className="h-8 w-8 text-cyan-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 9a2.25 2.25 0 0 1 2.25-2.25h2.379a1.5 1.5 0 0 0 1.06-.44l.88-.879a1.5 1.5 0 0 1 1.06-.44h4.242a1.5 1.5 0 0 1 1.06.44l.88.88a1.5 1.5 0 0 0 1.06.44H19.5A2.25 2.25 0 0 1 21.75 9v8.25a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V9Zm6 4.5a3.75 3.75 0 1 0 7.5 0 3.75 3.75 0 0 0-7.5 0Z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Camera Vault NAS</h1>
          <p className="mt-2 text-sm font-medium text-cyan-200">{getGreetingMessage()}</p>
          <p className="mt-1 text-sm text-slate-300">
            撮影データを安全に保存して、すばやく閲覧
          </p>
        </div>

        {/* ログインフォーム */}
        <form
          onSubmit={handleSubmit}
          className={`rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl ${
            shakeForm ? "login-shake" : ""
          }`}
        >
          <div className="mb-4 flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-200/90">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1">RAW</span>
            <span className="rounded-full border border-blue-300/30 bg-blue-300/10 px-2 py-1">JPEG</span>
            <span className="rounded-full border border-indigo-300/30 bg-indigo-300/10 px-2 py-1">EXIF</span>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-slate-100"
              >
                Username
              </label>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-100"
              >
                Password
              </label>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21h-10.5A2.25 2.25 0 0 1 4.5 18.75v-6A2.25 2.25 0 0 1 6.75 10.5Z"
                  />
                </svg>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40"
                />
              </div>
            </div>
          </div>

          <p
            className={`mt-3 text-xs text-cyan-100/90 transition-all duration-300 ${
              username || password ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
            }`}
          >
            入力内容を確認しています...
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-cyan-400 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-300">
            カメラ専用ストレージです。許可のないアクセスは禁止されています。
          </p>
        </form>
      </div>
      <style jsx>{`
        .login-shake {
          animation: login-shake 0.4s ease-in-out;
        }
        @keyframes login-shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-8px);
          }
          40% {
            transform: translateX(8px);
          }
          60% {
            transform: translateX(-6px);
          }
          80% {
            transform: translateX(6px);
          }
        }
      `}</style>
    </div>
  );
}
