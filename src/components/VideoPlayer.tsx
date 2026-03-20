"use client";

import { useEffect, useRef } from "react";
import type { FileInfo } from "@/types/files";

interface VideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileInfo | null;
  currentPath: string;
}

export default function VideoPlayer({
  isOpen,
  onClose,
  item,
  currentPath,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const videoPath = [currentPath, item.name].filter(Boolean).join("/");
  const streamUrl = `/api/files/stream?path=${encodeURIComponent(videoPath)}`;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-3 pt-[calc(var(--safe-area-top)+12px)]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {item.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 動画プレイヤー */}
      <video
        ref={videoRef}
        src={streamUrl}
        controls
        autoPlay
        playsInline
        className="max-h-full max-w-full"
        style={{ outline: "none" }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
