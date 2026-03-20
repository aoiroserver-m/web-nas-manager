"use client";

import { useState, useRef, useEffect } from "react";
import Modal from "./Modal";
import { createFolder } from "@/lib/api";

export type SortKey = "name" | "size" | "modified";
export type SortOrder = "asc" | "desc";
export type ViewMode = "list" | "grid" | "map";

interface ToolbarProps {
  currentPath: string;
  onUploadClick: () => void;
  onRefresh: () => void;
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSortChange: (key: SortKey, order: SortOrder) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "size", label: "Size" },
  { key: "modified", label: "Date" },
];

export default function Toolbar({
  currentPath,
  onUploadClick,
  onRefresh,
  sortKey,
  sortOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
}: ToolbarProps) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSortMenu) return;
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createFolder(currentPath, folderName.trim());
      setShowNewFolder(false);
      setFolderName("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark active:scale-[0.97]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <span className="hidden sm:inline">Upload</span>
        </button>

        <button
          onClick={() => setShowNewFolder(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover active:scale-[0.97]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
          <span className="hidden sm:inline">New Folder</span>
        </button>

        <div className="flex-1" />

        {/* ソート */}
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-hover"
            title="Sort"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-border bg-surface shadow-xl">
              <div className="py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      const newOrder = sortKey === opt.key && sortOrder === "asc" ? "desc" : "asc";
                      onSortChange(opt.key, newOrder);
                      setShowSortMenu(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-surface-hover"
                  >
                    <span>{opt.label}</span>
                    {sortKey === opt.key && (
                      <svg
                        className={`h-3.5 w-3.5 text-primary ${sortOrder === "desc" ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* リスト/グリッド/マップ切替 */}
        <div className="flex rounded-lg border border-border">
          <button
            onClick={() => onViewModeChange("list")}
            className={`rounded-l-lg p-1.5 transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-hover"}`}
            title="List view"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={`border-x border-border p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-hover"}`}
            title="Grid view"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("map")}
            className={`rounded-r-lg p-1.5 transition-colors ${viewMode === "map" ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-hover"}`}
            title="Map view"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </button>
        </div>

        {/* リフレッシュ */}
        <button
          onClick={onRefresh}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-hover"
          title="Refresh"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
        </button>
      </div>

      <Modal
        isOpen={showNewFolder}
        onClose={() => { setShowNewFolder(false); setFolderName(""); setError(null); }}
        title="New Folder"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowNewFolder(false); setFolderName(""); setError(null); }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim() || creating}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
