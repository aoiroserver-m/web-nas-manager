"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useEffect } from "react";
import type { FileInfo } from "@/types/files";
import { toggleFavorite, getFileTags as fetchFileTags } from "@/lib/api";

interface FileListItemProps {
  item: FileInfo;
  currentPath: string;
  onContextMenu: (item: FileInfo, position: { x: number; y: number }) => void;
  onImageClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (item: FileInfo) => void;
}

/**
 * Format file size to human-readable string.
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format date to localized string.
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FileIcon({ item }: { item: FileInfo }) {
  const [imgError, setImgError] = useState(false);

  if (item.type === "directory") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <svg
          className="h-5 w-5 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
          />
        </svg>
      </div>
    );
  }

  if (item.thumbnailUrl && (item.isImage || item.isVideo) && !imgError) {
    return (
      <div className="h-10 w-10 overflow-hidden rounded-lg bg-surface-hover">
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (item.isVideo) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
        <svg
          className="h-5 w-5 text-purple-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover">
      <svg
        className="h-5 w-5 text-text-secondary"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    </div>
  );
}

export default function FileListItem({
  item,
  currentPath,
  onContextMenu,
  onImageClick,
  selectionMode = false,
  isSelected = false,
  onSelect,
}: FileListItemProps) {
  const itemPath = [currentPath, item.name].filter(Boolean).join("/");
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // お気に入り・タグ状態を取得
  useEffect(() => {
    fetchFileTags(itemPath).then((data) => {
      setIsFavorite(!!data.favorite);
      setTags(data.tags || []);
    }).catch(() => {});
  }, [itemPath]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newState = !isFavorite;
    setIsFavorite(newState);
    try {
      await toggleFavorite(itemPath, newState);
    } catch {
      setIsFavorite(!newState);
    }
  };

  // ロングプレスでコンテキストメニュー（モバイル対応）
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

  const handleRowClick = useCallback(() => {
    if (selectionMode) {
      onSelect?.(item);
    }
  }, [selectionMode, onSelect, item]);

  const commonProps = {
    onContextMenu: handleRightClick,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchEnd,
  };

  const checkboxEl = (
    <button
      className="shrink-0 flex items-center justify-center w-8 h-8 -ml-1"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect?.(item);
      }}
    >
      <div
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? "bg-primary border-primary"
            : "border-gray-400 dark:border-gray-500"
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
    </button>
  );

  if (item.type === "directory") {
    if (selectionMode) {
      return (
        <li>
          <div
            className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
              isSelected ? "bg-primary/10" : "hover:bg-surface-hover"
            }`}
            onClick={handleRowClick}
            {...commonProps}
          >
            {checkboxEl}
            <FileIcon item={item} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-xs text-text-secondary">{formatDate(item.modified)}</p>
            </div>
          </div>
        </li>
      );
    }
    return (
      <li>
        <Link
          href={`/files/${itemPath}`}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover active:bg-surface-hover"
          {...commonProps}
        >
          <FileIcon item={item} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.name}</p>
            <p className="text-xs text-text-secondary">
              {formatDate(item.modified)}
            </p>
          </div>
          <svg
            className="h-4 w-4 shrink-0 text-text-secondary/50"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div
        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
          isSelected ? "bg-primary/10" : "hover:bg-surface-hover"
        } ${onImageClick || selectionMode ? "cursor-pointer" : ""}`}
        onClick={selectionMode ? handleRowClick : onImageClick}
        {...commonProps}
      >
        {selectionMode && checkboxEl}
        <FileIcon item={item} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">
              {formatSize(item.size)} - {formatDate(item.modified)}
            </span>
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {t}
              </span>
            ))}
          </div>
        </div>
        {!selectionMode && (
          <>
            {/* お気に入り星アイコン */}
            <button
              onClick={handleFavoriteClick}
              className="shrink-0 rounded p-1 transition-colors hover:bg-surface-hover"
            >
              {isFavorite ? (
                <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-text-secondary/30 hover:text-yellow-500/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              )}
            </button>
            {/* 3ドットメニューボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onContextMenu(item, { x: rect.right, y: rect.bottom });
              }}
              className="shrink-0 rounded-lg p-1.5 text-text-secondary/50 transition-colors hover:bg-surface-hover hover:text-text-secondary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
              </svg>
            </button>
          </>
        )}
      </div>
    </li>
  );
}
