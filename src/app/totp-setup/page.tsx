"use client";

import { useEffect, useState } from "react";

export default function TotpSetupPage() {
  const [data, setData] = useState<{
    setup: boolean;
    qr?: string;
    otpauth?: string;
    issuer?: string;
    account?: string;
    message?: string;
    TOTP_SECRET?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/totp-setup")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a14] text-white">
        読み込み中…
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
          <p className="text-xs text-white/40">
            {data.issuer} / {data.account}
          </p>
          {data.otpauth && (
            <details className="w-full max-w-sm">
              <summary className="cursor-pointer text-xs text-white/30">
                手動入力用シークレット
              </summary>
              <p className="mt-1 break-all rounded-lg bg-white/5 p-3 font-mono text-xs text-white/60">
                {data.otpauth}
              </p>
            </details>
          )}
          <p className="text-center text-sm text-green-400">
            セットアップ済みです。スキャン後はこのページを閉じてください。
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
