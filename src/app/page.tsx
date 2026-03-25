"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_DRIVES } from "@/lib/constants";

// 世界各地の絶景写真（Unsplash）
const SCENE_IMAGES = [
  { url: "https://images.unsplash.com/photo-1506905641158-3fcd7d12dfb5?auto=format&fit=crop&w=1920&q=85", label: "Swiss Alps" },
  { url: "https://images.unsplash.com/photo-1465311354632-3f49ff065403?auto=format&fit=crop&w=1920&q=85", label: "Aurora Borealis" },
  { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85", label: "Tropical Beach" },
  { url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=85", label: "Snowy Mountains" },
  { url: "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1920&q=85", label: "Milky Way" },
  { url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=85", label: "Mountain Lake" },
  { url: "https://images.unsplash.com/photo-1493246507139-e4e1877cfa48?auto=format&fit=crop&w=1920&q=85", label: "Tropical Waterfall" },
  { url: "https://images.unsplash.com/photo-1455218873509-8097305ee378?auto=format&fit=crop&w=1920&q=85", label: "Cherry Blossoms" },
  { url: "https://images.unsplash.com/photo-1521483451569-e6b58d916f53?auto=format&fit=crop&w=1920&q=85", label: "Lavender Field" },
  { url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?auto=format&fit=crop&w=1920&q=85", label: "Autumn Forest" },
  { url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1920&q=85", label: "Tuscany Vineyard" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=85", label: "Golden Wheat Field" },
];

const SLIDE_INTERVAL = 8000;   // 画像切替（ms）
const TRANSITION_DURATION = 1500; // フェード時間（ms）
const SCREENSAVER_TIMEOUT = 60000; // スクリーンセーバー発動（ms）

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getGreeting(date: Date) {
  const h = date.getHours();
  if (h >= 5 && h < 11) return { text: "おはようございます", sub: "今日も素敵な一日を" };
  if (h >= 11 && h < 17) return { text: "こんにちは", sub: "写真の整理でも？" };
  if (h >= 17 && h < 23) return { text: "おかえりなさい", sub: "今日の撮影はどうでしたか" };
  return { text: "夜更かしですね", sub: "ゆっくり眺めていってください" };
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function Home() {
  const now = useTime();
  const greeting = getGreeting(now);

  // スライドショー
  // layer0 / layer1 を交互に使いクロスフェード
  const [layer0, setLayer0] = useState(0);
  const [layer1, setLayer1] = useState(1);
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0); // 前面レイヤー
  const [transitioning, setTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextIdxRef = useRef(2);

  // スクリーンセーバー
  const [screensaver, setScreensaver] = useState(false);
  const [ssPos, setSsPos] = useState({ x: 50, y: 50 }); // 時計の位置（%）
  const ssTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ssPosTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 次の画像へ
  const goNext = useCallback(() => {
    if (transitioning) return;
    const nextIdx = nextIdxRef.current % SCENE_IMAGES.length;
    nextIdxRef.current += 1;

    setTransitioning(true);
    if (activeLayer === 0) {
      setLayer1(nextIdx);
      setTimeout(() => {
        setActiveLayer(1);
        setTimeout(() => {
          setLayer0(nextIdx);
          setTransitioning(false);
          setProgress(0);
        }, TRANSITION_DURATION);
      }, 50);
    } else {
      setLayer0(nextIdx);
      setTimeout(() => {
        setActiveLayer(0);
        setTimeout(() => {
          setLayer1(nextIdx);
          setTransitioning(false);
          setProgress(0);
        }, TRANSITION_DURATION);
      }, 50);
    }
  }, [activeLayer, transitioning]);

  // スライドタイマー
  useEffect(() => {
    slideTimer.current = setTimeout(goNext, SLIDE_INTERVAL);
    return () => { if (slideTimer.current) clearTimeout(slideTimer.current); };
  }, [goNext, layer0, layer1]);

  // プログレスバー
  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / SLIDE_INTERVAL, 1));
    }, 50);
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [layer0, layer1]);

  // スクリーンセーバー：非操作で発動
  const resetSsTimer = useCallback(() => {
    if (screensaver) setScreensaver(false);
    if (ssTimer.current) clearTimeout(ssTimer.current);
    ssTimer.current = setTimeout(() => setScreensaver(true), SCREENSAVER_TIMEOUT);
  }, [screensaver]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"];
    events.forEach((e) => window.addEventListener(e, resetSsTimer));
    ssTimer.current = setTimeout(() => setScreensaver(true), SCREENSAVER_TIMEOUT);
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetSsTimer));
      if (ssTimer.current) clearTimeout(ssTimer.current);
    };
  }, [resetSsTimer]);

  // スクリーンセーバー：時計の位置をゆっくり動かすburnin対策
  useEffect(() => {
    if (!screensaver) {
      if (ssPosTimer.current) clearInterval(ssPosTimer.current);
      return;
    }
    ssPosTimer.current = setInterval(() => {
      setSsPos({
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      });
    }, 12000);
    return () => { if (ssPosTimer.current) clearInterval(ssPosTimer.current); };
  }, [screensaver]);

  const currentScene = SCENE_IMAGES[activeLayer === 0 ? layer0 : layer1];

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-slate-950 cursor-default"
      onClick={screensaver ? () => setScreensaver(false) : undefined}
    >
      {/* ---- 背景レイヤー0 ---- */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity"
        style={{
          backgroundImage: `url(${SCENE_IMAGES[layer0].url})`,
          opacity: activeLayer === 0 ? 1 : 0,
          transitionDuration: `${TRANSITION_DURATION}ms`,
          zIndex: activeLayer === 0 ? 2 : 1,
        }}
      />
      {/* ---- 背景レイヤー1 ---- */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity"
        style={{
          backgroundImage: `url(${SCENE_IMAGES[layer1].url})`,
          opacity: activeLayer === 1 ? 1 : 0,
          transitionDuration: `${TRANSITION_DURATION}ms`,
          zIndex: activeLayer === 1 ? 2 : 1,
        }}
      />

      {/* 全体に薄い暗幕 */}
      <div className="absolute inset-0 z-10 bg-black/40" />

      {/* ---- 通常UI ---- */}
      <div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 py-10 transition-all duration-700"
        style={{ opacity: screensaver ? 0 : 1, pointerEvents: screensaver ? "none" : "auto" }}
      >
        {/* ロゴ + タイトル */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-sm">
            <svg className="h-7 w-7 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9a2.25 2.25 0 0 1 2.25-2.25h2.379a1.5 1.5 0 0 0 1.06-.44l.88-.879a1.5 1.5 0 0 1 1.06-.44h4.242a1.5 1.5 0 0 1 1.06.44l.88.88a1.5 1.5 0 0 0 1.06.44H19.5A2.25 2.25 0 0 1 21.75 9v8.25a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V9Zm6 4.5a3.75 3.75 0 1 0 7.5 0 3.75 3.75 0 0 0-7.5 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg">Camera Vault NAS</h1>
        </div>

        {/* 時刻 */}
        <p className="mb-1 text-sm text-white/60 drop-shadow">{formatDate(now)}</p>
        <p className="mb-6 font-mono text-5xl font-light tracking-widest text-white drop-shadow-xl tabular-nums">
          {formatTime(now)}
        </p>

        {/* グリーティング */}
        <div className="mb-8 rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-center backdrop-blur-md shadow-2xl">
          <p className="text-lg font-semibold text-white drop-shadow">蒼さん、{greeting.text}</p>
          <p className="mt-0.5 text-sm text-white/60">{greeting.sub}</p>
        </div>

        {/* ストレージドライブ */}
        <div className="w-full max-w-2xl">
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Storage Drives
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STORAGE_DRIVES.map((drive) => (
              <Link
                key={drive.id}
                href={`/files/${drive.id}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-md transition-all hover:border-cyan-400/50 hover:bg-white/20 hover:scale-[1.03] hover:shadow-xl"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.12),transparent_70%)]" />
                <div className="flex items-center gap-2">
                  {drive.icon === "ssd" ? (
                    <svg className="h-4 w-4 shrink-0 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z" />
                    </svg>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors">{drive.name}</p>
                    <p className="truncate text-[10px] text-white/40">{drive.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* クイックアクセス */}
        <div className="mt-5 flex gap-2">
          <Link href="/favorites" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm transition-all hover:border-yellow-400/40 hover:text-yellow-300">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            お気に入り
          </Link>
          <Link href="/search" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:text-cyan-300">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            ファイルを検索
          </Link>
        </div>
      </div>

      {/* ---- スクリーンセーバーUI ---- */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-1000"
        style={{ opacity: screensaver ? 1 : 0 }}
      >
        {/* 時計（位置がゆっくり動く） */}
        <div
          className="absolute transition-all duration-[12000ms] ease-in-out"
          style={{ left: `${ssPos.x}%`, top: `${ssPos.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <p className="text-center text-sm font-light tracking-widest text-white/40 drop-shadow">
            {formatDate(now)}
          </p>
          <p className="font-mono text-6xl font-thin tracking-widest text-white/80 drop-shadow-2xl tabular-nums">
            {formatTime(now)}
          </p>
        </div>
        {/* タップで戻るヒント */}
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs tracking-widest text-white/20">
          タップして戻る
        </p>
      </div>

      {/* ---- 下部：撮影地ラベル + プログレスバー ---- */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-700"
        style={{ opacity: screensaver ? 0 : 1 }}
      >
        {/* 撮影地ラベル */}
        <div className="flex items-center justify-between px-5 pb-2">
          <span className="text-xs tracking-widest text-white/30 uppercase">{currentScene.label}</span>
          <button
            onClick={goNext}
            className="rounded-full p-1.5 text-white/30 transition-colors hover:text-white/70"
            title="次の画像"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
        {/* プログレスバー */}
        <div className="h-px w-full bg-white/10">
          <div
            className="h-full bg-white/40 transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
