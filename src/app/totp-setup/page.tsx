"use client";

import { useState } from "react";

type SetupData = {
  setup: boolean;
  qr?: string;
  otpauth?: string;
  issuer?: string;
  account?: string;
  message?: string;
  TOTP_SECRET?: string;
};

export default function TotpSetupPage() {
  const [passcode, setPasscode] = useState("");
  const [data, setData] = useState<SetupData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/totp-setup?passcode=${encodeURIComponent(passcode)}`);
      if (res.status === 401) {
        setError("パスコードが違います");
        return;
      }
      setData(await res.json());
    } catch {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a14] p-6 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
          <svg className="h-7 w-7 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold">TOTP セットアップ</h1>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="ACCESS_PASSCODE を入力"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white placeholder-white/20 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
          />
          {error && <p className="text-center text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !passcode}
            className="rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-white transition-all hover:bg-cyan-400 disabled:opacity-40"
          >
            {loading ? "確認中…" : "続ける"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a14] p-6 text-white">
      <h1 className="text-xl font-bold">TOTP セットアップ</h1>

      {data.setup ? (
        <>
          <p className="text-sm text-white/60">
            Google Authenticator などでこのQRコードをスキャンしてください
          </p>
          {data.qr && (
            <img
              src={data.qr}
              alt="TOTP QR Code"
              className="rounded-xl border border-white/10"
              width={220}
              height={220}
            />
          )}
          <p className="text-xs text-white/40">{data.issuer} / {data.account}</p>
          {data.otpauth && (
            <details className="w-full max-w-sm">
              <summary className="cursor-pointer text-xs text-white/30">手動入力用シークレット</summary>
              <p className="mt-1 break-all rounded-lg bg-white/5 p-3 font-mono text-xs text-white/60">
                {data.otpauth}
              </p>
            </details>
          )}
          <p className="text-center text-sm text-green-400">
            スキャン後はこのページを閉じてください。
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-yellow-400">{data.message}</p>
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-1 text-xs text-white/40">以下を .env に追加してください：</p>
            <p className="break-all font-mono text-sm text-cyan-300">
              TOTP_SECRET={data.TOTP_SECRET}
            </p>
          </div>
          <p className="text-xs text-white/30">
            追加後に docker-compose を再起動して、このページをリロードしてください。
          </p>
        </>
      )}
    </div>
  );
}
