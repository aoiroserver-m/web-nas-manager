"use client";

import { useCallback, useRef, useState } from "react";
import { uploadFile } from "@/lib/api";

interface UploadAreaProps {
  currentPath: string;
  onUploadComplete: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  children?: React.ReactNode;
}

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

export default function UploadArea({ currentPath, onUploadComplete, fileInputRef, children }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const dragCounterRef = useRef(0);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsExpanded(true);

      const newTasks: UploadTask[] = fileArray.map((f, i) => ({
        id: `${Date.now()}-${i}`,
        name: f.name,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploads((prev) => [...newTasks, ...prev]);

      await Promise.allSettled(
        fileArray.map(async (file, i) => {
          const taskId = newTasks[i].id;
          try {
            await uploadFile(file, currentPath, (percent) => {
              setUploads((prev) =>
                prev.map((t) =>
                  t.id === taskId ? { ...t, progress: percent } : t
                )
              );
            });
            setUploads((prev) =>
              prev.map((t) =>
                t.id === taskId ? { ...t, status: "done", progress: 100 } : t
              )
            );
          } catch (err) {
            setUploads((prev) =>
              prev.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      status: "error",
                      error: err instanceof Error ? err.message : "Failed",
                    }
                  : t
              )
            );
          }
        })
      );

      onUploadComplete();
    },
    [currentPath, onUploadComplete]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = "";
      }
    },
    [processFiles]
  );

  const clearCompleted = () => {
    setUploads((prev) => prev.filter((t) => t.status === "uploading"));
    if (uploads.every((t) => t.status !== "uploading")) {
      setIsExpanded(false);
    }
  };

  const activeCount = uploads.filter((t) => t.status === "uploading").length;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {/* ドラッグオーバーレイ */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="h-10 w-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium text-primary">
              Drop files to upload
            </p>
          </div>
        </div>
      )}

      {/* ファイル選択input（Toolbarのボタンから参照） */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {children}

      {/* アップロード進捗パネル */}
      {uploads.length > 0 && (
        <div className="border-t border-border bg-surface-alt">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-surface-hover"
          >
            <span className="font-medium">
              {activeCount > 0
                ? `Uploading ${activeCount} file${activeCount > 1 ? "s" : ""}...`
                : "Upload complete"}
            </span>
            <div className="flex items-center gap-2">
              {activeCount === 0 && uploads.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCompleted();
                  }}
                  className="rounded px-2 py-0.5 text-xs text-text-secondary hover:bg-surface-hover"
                >
                  Clear
                </button>
              )}
              <svg
                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </button>
          {isExpanded && (
            <div className="max-h-48 overflow-y-auto">
              {uploads.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 border-t border-border/50 px-4 py-2"
                >
                  {task.status === "uploading" && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                  {task.status === "done" && (
                    <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                  {task.status === "error" && (
                    <svg className="h-4 w-4 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{task.name}</p>
                    {task.status === "uploading" && (
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                    {task.status === "error" && (
                      <p className="text-xs text-danger">{task.error}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-text-secondary">
                    {task.status === "uploading" && `${task.progress}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
