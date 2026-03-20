"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DirectoryListing, FileInfo } from "@/types/files";
import { fetchFiles, deleteItem, renameItem, getDownloadUrl, toggleFavorite, updateTags, getFileTags as fetchFileTags, getAllTags } from "@/lib/api";
import FileListItem from "./FileListItem";
import FileGridItem from "./FileGridItem";
import Toolbar, { type SortKey, type SortOrder, type ViewMode } from "./Toolbar";
import UploadArea from "./UploadArea";
import ContextMenu from "./ContextMenu";
import ImagePreview from "./ImagePreview";
import VideoPlayer from "./VideoPlayer";
import PhotoMapView from "./PhotoMapView";
import Modal from "./Modal";

interface FileListContainerProps {
  currentPath: string;
}

export default function FileListContainer({
  currentPath,
}: FileListContainerProps) {
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // コンテキストメニュー
  const [contextMenu, setContextMenu] = useState<{
    item: FileInfo;
    position: { x: number; y: number };
  } | null>(null);

  // リネームモーダル
  const [renameTarget, setRenameTarget] = useState<FileInfo | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // 削除確認モーダル
  const [deleteTarget, setDeleteTarget] = useState<FileInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 画像プレビュー
  const [previewIndex, setPreviewIndex] = useState(-1);

  // 動画プレイヤー
  const [videoTarget, setVideoTarget] = useState<FileInfo | null>(null);

  // タグ/お気に入り
  const [tagTarget, setTagTarget] = useState<FileInfo | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [fileTags, setFileTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // ソート・表示モード（localStorageで永続化）
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "name";
    try {
      const stored = localStorage.getItem("web-nas-sort");
      return stored ? (JSON.parse(stored).key as SortKey) : "name";
    } catch { return "name"; }
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    if (typeof window === "undefined") return "asc";
    try {
      const stored = localStorage.getItem("web-nas-sort");
      return stored ? (JSON.parse(stored).order as SortOrder) : "asc";
    } catch { return "asc"; }
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem("web-nas-view") as ViewMode) || "list";
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFiles(currentPath);
      setListing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleSortChange = (key: SortKey, order: SortOrder) => {
    setSortKey(key);
    setSortOrder(order);
    localStorage.setItem("web-nas-sort", JSON.stringify({ key, order }));
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("web-nas-view", mode);
  };

  // ソート済みアイテム（フォルダ常に先頭）
  const sorted = listing
    ? [...listing.items].sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        const dir = sortOrder === "asc" ? 1 : -1;
        switch (sortKey) {
          case "size":
            return (a.size - b.size) * dir;
          case "modified":
            return (new Date(a.modified).getTime() - new Date(b.modified).getTime()) * dir;
          default:
            return a.name.localeCompare(b.name, "ja") * dir;
        }
      })
    : [];

  // 画像ファイルのみ（プレビュー用）
  const imageFiles = sorted.filter((item) => item.isImage);

  const handleContextMenu = (item: FileInfo, position: { x: number; y: number }) => {
    setContextMenu({ item, position });
  };

  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;
    setRenaming(true);
    setRenameError(null);
    try {
      const itemPath = [currentPath, renameTarget.name].filter(Boolean).join("/");
      await renameItem(itemPath, newName.trim());
      setRenameTarget(null);
      setNewName("");
      loadFiles();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const itemPath = [currentPath, deleteTarget.name].filter(Boolean).join("/");
      await deleteItem(itemPath);
      setDeleteTarget(null);
      loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleImageClick = (item: FileInfo) => {
    const index = imageFiles.findIndex((img) => img.name === item.name);
    if (index >= 0) setPreviewIndex(index);
  };

  const handleToggleFavorite = async (item: FileInfo) => {
    const itemPath = [currentPath, item.name].filter(Boolean).join("/");
    try {
      const current = await fetchFileTags(itemPath);
      await toggleFavorite(itemPath, !current.favorite);
    } catch {
      // 無視
    }
  };

  const openTagEditor = async (item: FileInfo) => {
    setTagTarget(item);
    const itemPath = [currentPath, item.name].filter(Boolean).join("/");
    try {
      const [current, all] = await Promise.all([
        fetchFileTags(itemPath),
        getAllTags(),
      ]);
      setFileTags(current.tags || []);
      setIsFavorite(current.favorite || false);
      setExistingTags(all);
    } catch {
      setFileTags([]);
      setExistingTags([]);
    }
  };

  const handleAddTag = async () => {
    if (!tagTarget || !tagInput.trim()) return;
    const newTag = tagInput.trim();
    if (fileTags.includes(newTag)) { setTagInput(""); return; }
    const updated = [...fileTags, newTag];
    setFileTags(updated);
    setTagInput("");
    const itemPath = [currentPath, tagTarget.name].filter(Boolean).join("/");
    await updateTags(itemPath, updated);
  };

  const handleRemoveTag = async (tag: string) => {
    if (!tagTarget) return;
    const updated = fileTags.filter((t) => t !== tag);
    setFileTags(updated);
    const itemPath = [currentPath, tagTarget.name].filter(Boolean).join("/");
    await updateTags(itemPath, updated);
  };

  const contextMenuItems = contextMenu
    ? [
        // お気に入りトグル
        {
          label: "Favorite",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          ),
          onClick: () => handleToggleFavorite(contextMenu.item),
        },
        // タグ編集
        {
          label: "Tags",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
          ),
          onClick: () => openTagEditor(contextMenu.item),
        },
        ...(contextMenu.item.type === "file"
          ? [
              {
                label: "Download",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                ),
                onClick: () => {
                  const itemPath = [currentPath, contextMenu.item.name].filter(Boolean).join("/");
                  window.open(getDownloadUrl(itemPath), "_blank");
                },
              },
            ]
          : []),
        {
          label: "Rename",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
          ),
          onClick: () => {
            setRenameTarget(contextMenu.item);
            setNewName(contextMenu.item.name);
          },
        },
        {
          label: "Delete",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          ),
          onClick: () => setDeleteTarget(contextMenu.item),
          danger: true,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-text-secondary">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-6 py-4 text-center">
          <p className="font-medium text-danger">Error</p>
          <p className="mt-1 text-sm text-text-secondary">{error}</p>
          <button
            onClick={loadFiles}
            className="mt-3 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Toolbar
        currentPath={currentPath}
        onUploadClick={() => fileInputRef.current?.click()}
        onRefresh={loadFiles}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      <UploadArea
        currentPath={currentPath}
        onUploadComplete={loadFiles}
        fileInputRef={fileInputRef}
      />

      {viewMode === "map" ? (
        <PhotoMapView
          currentPath={currentPath}
          onPhotoClick={(photo) => {
            const idx = imageFiles.findIndex((img) => img.name === photo.name);
            if (idx >= 0) setPreviewIndex(idx);
          }}
        />
      ) : sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-secondary/30"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
              />
            </svg>
            <p className="mt-2 text-sm text-text-secondary">
              This folder is empty
            </p>
            <p className="mt-1 text-xs text-text-secondary/60">
              Upload files or create a new folder to get started
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-3 gap-1 p-2 sm:grid-cols-4 lg:grid-cols-6">
              {sorted.map((item: FileInfo) => (
                <FileGridItem
                  key={`${currentPath}/${item.name}`}
                  item={item}
                  currentPath={currentPath}
                  onContextMenu={handleContextMenu}
                  onImageClick={item.isImage ? () => handleImageClick(item) : item.isVideo ? () => setVideoTarget(item) : undefined}
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sorted.map((item: FileInfo) => (
                <FileListItem
                  key={`${currentPath}/${item.name}`}
                  item={item}
                  currentPath={currentPath}
                  onContextMenu={handleContextMenu}
                  onImageClick={item.isImage ? () => handleImageClick(item) : item.isVideo ? () => setVideoTarget(item) : undefined}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* コンテキストメニュー */}
      <ContextMenu
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        items={contextMenuItems}
        position={contextMenu?.position ?? { x: 0, y: 0 }}
      />

      {/* リネームモーダル */}
      <Modal
        isOpen={!!renameTarget}
        onClose={() => {
          setRenameTarget(null);
          setNewName("");
          setRenameError(null);
        }}
        title="Rename"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRename();
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {renameError && (
            <p className="mt-2 text-sm text-danger">{renameError}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRenameTarget(null);
                setNewName("");
                setRenameError(null);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName === renameTarget?.name || renaming}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {renaming ? "Renaming..." : "Rename"}
            </button>
          </div>
        </form>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete"
      >
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete{" "}
          <span className="font-medium text-text">{deleteTarget?.name}</span>?
          {deleteTarget?.type === "directory" && (
            <span className="block mt-1 text-danger">
              This will delete the folder and all its contents.
            </span>
          )}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setDeleteTarget(null)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>

      {/* タグ編集モーダル */}
      <Modal
        isOpen={!!tagTarget}
        onClose={() => { setTagTarget(null); setTagInput(""); }}
        title="Tags"
      >
        <div className="space-y-3">
          {/* 現在のタグ */}
          {fileTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {fileTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 rounded-full hover:bg-primary/20"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* タグ追加 */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddTag(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag..."
              list="existing-tags"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <datalist id="existing-tags">
              {existingTags.filter((t) => !fileTags.includes(t)).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <button
              type="submit"
              disabled={!tagInput.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      </Modal>

      {/* 画像プレビュー */}
      <ImagePreview
        isOpen={previewIndex >= 0}
        onClose={() => setPreviewIndex(-1)}
        images={imageFiles}
        currentIndex={previewIndex}
        currentPath={currentPath}
        onNavigate={setPreviewIndex}
      />

      {/* 動画プレイヤー */}
      <VideoPlayer
        isOpen={!!videoTarget}
        onClose={() => setVideoTarget(null)}
        item={videoTarget}
        currentPath={currentPath}
      />
    </div>
  );
}
