"use client";

import { useEffect, useRef, useState } from "react";
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
  const [visible, setVisible] = useState(false);

  // マウント時にアニメーション開始
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    inputRef.current?.focus();
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  // 6桁入力で自動送信
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
    setError("");
    if (val.length === 6) submit(val);
  };

  const submit = async (value: string) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      if (res.ok) {
        setVisible(false);
        setTimeout(() => {
          onClose();
          router.push(targetHref);
        }, 300);
      } else {
        const data = await res.json();
        setError(data.message || "コードが違います");
        setCode("");
        inputRef.current?.focus();
      }
    } catch {
      setError("エラーが発生しました");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) submit(code);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* バックドロップ */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* モーダル本体 — モバイルはボトムシート、デスクトップはセンタリング */}
      <div
        className={`
          relative w-full sm:max-w-xs
          rounded-t-3xl sm:rounded-3xl
          border border-white/10 bg-[#12121f]/95
          px-6 pb-10 pt-6 sm:px-8 sm:py-8
          shadow-2xl
          transition-transform duration-300 ease-out
          ${visible ? "translate-y-0" : "translate-y-full sm:translate-y-4"}
          sm:transition-[transform,opacity]
          ${visible ? "sm:opacity-100" : "sm:opacity-0"}
        `}
      >
        {/* ドラッグハンドル（モバイルのみ） */}
        <div className="mb-5 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* 鍵アイコン（デスクトップのみ） */}
        <div className="mb-4 hidden justify-center sm:flex">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <svg className="h-7 w-7 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
        </div>

        <p className="mb-0.5 text-center text-base font-semibold text-white">{driveName}</p>
        <p className="mb-1 text-center text-sm text-white/40">Authenticator アプリのコードを入力</p>
        <p className="mb-5 text-center text-xs text-white/25">30秒ごとに更新されます</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={code}
            onChange={handleChange}
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-white/15 outline-none transition-colors focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
          />

          {error && (
            <p className="text-center text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-white transition-all hover:bg-cyan-400 active:scale-95 disabled:opacity-40"
          >
            {loading ? "確認中…" : "開く"}
          </button>
        </form>

        <button
          onClick={handleClose}
          className="mt-3 w-full py-2 text-sm text-white/30 transition-colors hover:text-white/60"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
