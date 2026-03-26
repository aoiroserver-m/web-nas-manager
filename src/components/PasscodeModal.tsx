"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PasscodeModalProps {
  driveName: string;
  targetHref: string;
  onClose: () => void;
}

export default function PasscodeModal({ driveName, targetHref, onClose }: PasscodeModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        onClose();
        router.push(targetHref);
      } else {
        const data = await res.json();
        setError(data.message || "パスコードが違います");
        setCode("");
        inputRef.current?.focus();
      }
    } catch {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* バックドロップ */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative w-full max-w-xs rounded-3xl border border-white/10 bg-[#12121f]/95 px-8 py-8 shadow-2xl">
        {/* 鍵アイコン */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
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
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
        </div>

        <p className="mb-1 text-center text-base font-semibold text-white">{driveName}</p>
        <p className="mb-6 text-center text-sm text-white/40">パスコードを入力してください</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            autoComplete="one-time-code"
            placeholder="••••••"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg tracking-[0.4em] text-white placeholder-white/20 outline-none transition-colors focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
          />

          {error && (
            <p className="text-center text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-white transition-all hover:bg-cyan-400 active:scale-95 disabled:opacity-40"
          >
            {loading ? "確認中…" : "開く"}
          </button>
        </form>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-sm text-white/30 transition-colors hover:text-white/60"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
