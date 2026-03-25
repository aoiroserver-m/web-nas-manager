"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import type { FileInfo } from "@/types/files";

interface FileGridItemProps {
  item: FileInfo;
  currentPath: string;
  onContextMenu: (item: FileInfo, position: { x: number; y: number }) => void;
  onImageClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (item: FileInfo) => void;
}

export default function FileGridItem({
  item,
  currentPath,
  onContextMenu,
  onImageClick,
  selectionMode = false,
  isSelected = false,
  onSelect,
}: FileGridItemProps) {
  const itemPath = [currentPath, item.name].filter(Boolean).join("/");
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(
    (_e: React.TouchEvent) => {
      longPressTimerRef.current = setTimeout(() => {
        // 長押しは常に選択モードに入る
        onSelect?.(item);
      }, 500);
    },
    [item, onSelect]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleRightClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!selectionMode) {
        onContextMenu(item, { x: e.clientX, y: e.clientY });
      }
    },
    [item, onContextMenu, selectionMode]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (selectionMode) {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(item);
      }
    },
    [selectionMode, onSelect, item]
  );

  const commonProps = {
    onContextMenu: handleRightClick,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchEnd,
  };

  const checkbox = (
    <div
      className={`absolute top-1.5 left-1.5 z-10 transition-opacity ${
        selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(item);
      }}
    >
      <div
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shadow-sm transition-colors ${
          isSelected
            ? "bg-primary border-primary"
            : "bg-white/90 border-gray-400 dark:bg-black/60 dark:border-gray-500"
        }`}
      >
        {isSelected && (
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </div>
  );

  const thumbnail = (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-lg bg-surface-hover transition-all ${
        isSelected ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
    >
      {item.thumbnailUrl && (item.isImage || item.isVideo) ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : item.type === "directory" ? (
        <div className="flex h-full items-center justify-center">
          <svg className="h-10 w-10 text-primary/60" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
        </div>
      ) : item.isVideo ? (
        <div className="flex h-full items-center justify-center">
          <svg className="h-10 w-10 text-purple-500/60" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <svg className="h-10 w-10 text-text-secondary/40" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
      )}
      {checkbox}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none rounded-lg" />
      )}
    </div>
  );

  if (item.type === "directory") {
    if (selectionMode) {
      return (
        <div
          className={`group relative rounded-xl p-2 transition-colors cursor-pointer ${
            isSelected ? "bg-primary/10" : "hover:bg-surface-hover"
          }`}
          onClick={handleClick}
          {...commonProps}
        >
          {thumbnail}
          <p className="mt-1.5 truncate text-center text-xs font-medium">{item.name}</p>
        </div>
      );
    }
    return (
      <Link
        href={`/files/${itemPath}`}
        className="group relative rounded-xl p-2 transition-colors hover:bg-surface-hover"
        {...commonProps}
      >
        {thumbnail}
        <p className="mt-1.5 truncate text-center text-xs font-medium">{item.name}</p>
      </Link>
    );
  }

  return (
    <div
      className={`group relative rounded-xl p-2 transition-colors ${
        isSelected ? "bg-primary/10" : "hover:bg-surface-hover"
      } ${onImageClick || selectionMode ? "cursor-pointer" : ""}`}
      onClick={selectionMode ? handleClick : onImageClick}
      {...commonProps}
    >
      {thumbnail}
      <p className="mt-1.5 truncate text-center text-xs font-medium">{item.name}</p>
    </div>
  );
}
