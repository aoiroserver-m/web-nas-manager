"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { FileInfo } from "@/types/files";
import ImageMetadataPanel from "./ImageMetadata";

interface ImagePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  images: FileInfo[];
  currentIndex: number;
  currentPath: string;
  onNavigate: (index: number) => void;
}

export default function ImagePreview({
  isOpen,
  onClose,
  images,
  currentIndex,
  currentPath,
  onNavigate,
}: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentIndex];

  // インデックス変更時にローディング/エラー状態をリセット
  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, images.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "i":
          setShowInfo((prev) => !prev);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, goNext, goPrev]);

  // サムネイルストリップの自動スクロール
  useEffect(() => {
    if (!thumbnailStripRef.current) return;
    const activeThumb = thumbnailStripRef.current.querySelector("[data-active]");
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentIndex]);

  // スワイプ操作
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }

    touchStartRef.current = null;
  };

  if (!isOpen || !currentImage) return null;

  const imagePath = [currentPath, currentImage.name].filter(Boolean).join("/");

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-[#111119]">
      {/* トップバー */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-[#1a1a2e] px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <span className="text-sm text-white/80">{currentImage.name}</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-white/40">
            {currentIndex + 1} / {images.length}
          </span>

          {/* 情報パネルトグル */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`rounded p-1.5 transition-colors ${
              showInfo ? "bg-blue-500/20 text-blue-400" : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
            title="Info (i)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex min-h-0 flex-1">
        {/* 画像表示エリア */}
        <div
          className="relative flex flex-1 items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* ナビゲーションボタン（デスクトップ） */}
          {currentIndex > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white lg:block"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          {currentIndex < images.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white lg:block"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}

          {/* メイン画像 */}
          <div className="flex h-full w-full items-center justify-center p-4">
            {isLoading && !loadError && (
              <div className="absolute">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              </div>
            )}
            {loadError ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <svg className="h-14 w-14 text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-sm text-white/40">このファイルはプレビューできません</p>
                <a
                  href={`/api/files/download?path=${encodeURIComponent(imagePath)}`}
                  download={currentImage.name}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/20"
                >
                  ダウンロードする
                </a>
              </div>
            ) : (
              <img
                key={imagePath}
                src={`/api/thumbnail?path=${encodeURIComponent(imagePath)}`}
                alt={currentImage.name}
                className={`max-h-full max-w-full object-contain transition-opacity duration-200 ${
                  isLoading ? "opacity-0" : "opacity-100"
                }`}
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setLoadError(true); }}
                draggable={false}
              />
            )}
          </div>
        </div>

        {/* 右サイドパネル（Lightroom風） */}
        <ImageMetadataPanel
          imagePath={imagePath}
          isOpen={showInfo}
        />
      </div>

      {/* サムネイルストリップ */}
      {images.length > 1 && (
        <div className="shrink-0 border-t border-white/10 bg-[#1a1a2e]">
          <div
            ref={thumbnailStripRef}
            className="flex gap-1 overflow-x-auto px-2 py-2 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((img, idx) => {
              const thumbPath = [currentPath, img.name].filter(Boolean).join("/");
              const isActive = idx === currentIndex;
              return (
                <button
                  key={img.name}
                  data-active={isActive || undefined}
                  onClick={() => {
                    setIsLoading(true);
                    onNavigate(idx);
                  }}
                  className={`shrink-0 overflow-hidden rounded transition-all ${
                    isActive
                      ? "ring-2 ring-white ring-offset-1 ring-offset-[#1a1a2e]"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <img
                    src={`/api/thumbnail?path=${encodeURIComponent(thumbPath)}`}
                    alt=""
                    className="h-14 w-14 object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
