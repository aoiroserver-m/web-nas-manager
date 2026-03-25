"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FileInfo } from "@/types/files";

type SearchResult = FileInfo & { path: string };

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  truncated: boolean;
}

interface SearchResultsProps {
  query: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * パスからフォルダ部分を取得。
 */
function getParentPath(filePath: string): string {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

export default function SearchResults({ query }: SearchResultsProps) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/files/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Search failed");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  if (!query) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-secondary">Enter a search query</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-text-secondary">Searching...</span>
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
        </div>
      </div>
    );
  }

  if (data && data.results.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-text-secondary/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p className="mt-2 text-sm text-text-secondary">
            No results for &quot;{query}&quot;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* 検索ヘッダー */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm text-text-secondary">
          {data?.total} result{data && data.total !== 1 ? "s" : ""} for &quot;{query}&quot;
          {data?.truncated && (
            <span className="ml-1 text-xs text-text-secondary/60">(showing first 200)</span>
          )}
        </p>
      </div>

      {/* 結果一覧 */}
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-border">
          {data?.results.map((item) => {
            const parentPath = getParentPath(item.path);
            const isDir = item.type === "directory";
            const href = isDir
              ? `/files/${item.path}`
              : `/files/${parentPath}`;

            return (
              <li key={item.path}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                >
                  {/* アイコン/サムネイル */}
                  {item.thumbnailUrl && (item.isImage || item.isVideo) ? (
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
                      <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isDir ? "bg-primary/10" : item.isVideo ? "bg-purple-500/10" : "bg-surface-hover"
                    }`}>
                      {isDir ? (
                        <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                      ) : item.isVideo ? (
                        <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* ファイル情報 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="truncate text-xs text-text-secondary">
                      {parentPath}
                      {!isDir && ` - ${formatSize(item.size)}`}
                      {` - ${formatDate(item.modified)}`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
