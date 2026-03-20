"use client";

import { useEffect } from "react";

/**
 * Registers the Service Worker in production only.
 * 開発環境ではSWがアセットをキャッシュして古いモジュールを返すため無効化。
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // 開発環境では既存のSW登録を解除してキャッシュをクリア
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister());
      });
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW registration failed:", err);
    });
  }, []);

  return null;
}
