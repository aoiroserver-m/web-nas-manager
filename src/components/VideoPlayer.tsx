"use client";

import { useEffect, useRef, useState } from "react";
import type { FileInfo } from "@/types/files";
import ImageMetadataPanel from "./ImageMetadata";

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
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "i") setShowInfo((prev) => !prev);
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
    <div className="fixed inset-0 z-[1100] flex bg-black/95">
      {/* 動画エリア */}
      <div className="relative flex flex-1 flex-col">
        {/* ヘッダー */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-3 pt-[calc(var(--safe-area-top)+12px)]">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{item.name}</p>
          </div>
          <div className="flex items-center gap-1 ml-3">
            {/* Info ボタン */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`rounded-full p-2 backdrop-blur-sm transition-colors ${
                showInfo ? "bg-blue-500/30 text-blue-400" : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title="Info (i)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </button>
            {/* 閉じるボタン */}
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 動画プレイヤー */}
        <div className="flex flex-1 items-center justify-center">
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
      </div>

      {/* 右サイドパネル */}
      <ImageMetadataPanel imagePath={videoPath} isOpen={showInfo} />
    </div>
  );
}
