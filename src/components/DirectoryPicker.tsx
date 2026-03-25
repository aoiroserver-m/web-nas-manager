"use client";

import { useState, useEffect } from "react";
import { fetchFiles } from "@/lib/api";
import type { DirectoryListing } from "@/types/files";
import Modal from "./Modal";

interface DirectoryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  title?: string;
  initialPath?: string;
  /** 移動先として選択できないパス（選択対象のパス自身など） */
  excludePaths?: string[];
}

export default function DirectoryPicker({
  isOpen,
  onClose,
  onSelect,
  title = "フォルダを選択",
  initialPath = "",
  excludePaths = [],
}: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPath(initialPath);
    }
  }, [isOpen, initialPath]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchFiles(currentPath)
      .then((data) => {
        setListing(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, [currentPath, isOpen]);

  const dirs = listing?.items
    .filter((i) => i.type === "directory")
    .filter((i) => {
      const p = [currentPath, i.name].filter(Boolean).join("/");
      return !excludePaths.some((ex) => p === ex || p.startsWith(ex + "/"));
    }) ?? [];

  const navigate = (dirName: string) => {
    setCurrentPath([currentPath, dirName].filter(Boolean).join("/"));
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {/* パンくずナビ */}
      <div className="flex items-center gap-1 flex-wrap mb-3 min-h-[24px]">
        <button
          onClick={() => navigateTo("")}
          className="text-xs text-text-secondary hover:text-primary transition-colors"
        >
          Root
        </button>
        {listing?.breadcrumbs.slice(1).map((bc) => (
          <span key={bc.path} className="flex items-center gap-1">
            <svg className="h-3 w-3 text-text-secondary/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <button
              onClick={() => navigateTo(bc.path)}
              className="text-xs text-text-secondary hover:text-primary transition-colors"
            >
              {bc.name}
            </button>
          </span>
        ))}
      </div>

      {/* ディレクトリ一覧 */}
      <div className="max-h-60 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-danger">{error}</div>
        ) : dirs.length === 0 ? (
          <div className="p-4 text-center text-sm text-text-secondary">
            サブフォルダがありません
          </div>
        ) : (
          dirs.map((dir) => (
            <button
              key={dir.name}
              onClick={() => navigate(dir.name)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface-hover text-left transition-colors"
            >
              <svg
                className="h-4 w-4 text-primary/60 shrink-0"
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
              <span className="truncate flex-1">{dir.name}</span>
              <svg
                className="h-3.5 w-3.5 text-text-secondary/50 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))
        )}
      </div>

      {/* 現在のパス表示 + ボタン */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-text-secondary">選択中:</p>
          <p className="truncate text-sm font-medium text-text">
            /{currentPath || ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onSelect(currentPath);
              onClose();
            }}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            ここを選択
          </button>
        </div>
      </div>
    </Modal>
  );
}
