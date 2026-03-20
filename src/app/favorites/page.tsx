"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import type { FileInfo } from "@/types/files";

interface FavoriteEntry {
  path: string;
  data: { favorite?: boolean; tags?: string[] };
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getParentPath(filePath: string): string {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/files/tags?favorites=true")
      .then((res) => res.json())
      .then((data) => setFavorites(data.favorites || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        {/* ヘッダー */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <h2 className="text-lg font-semibold">Favorites</h2>
            {!loading && (
              <span className="text-sm text-text-secondary">({favorites.length})</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-text-secondary/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
              <p className="mt-2 text-sm text-text-secondary">No favorites yet</p>
              <p className="mt-1 text-xs text-text-secondary/60">
                Right-click a file and select Favorite
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-border">
              {favorites.map((entry) => {
                const name = getFileName(entry.path);
                const parentPath = getParentPath(entry.path);
                const isImage = /\.(jpg|jpeg|png|gif|webp|avif|raf|cr2|cr3|nef|arw|dng|heic)$/i.test(name);

                return (
                  <li key={entry.path}>
                    <Link
                      href={`/files/${parentPath}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                    >
                      {isImage ? (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
                          <img
                            src={`/api/thumbnail?path=${encodeURIComponent(entry.path)}`}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-hover">
                          <svg className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{name}</p>
                        <p className="truncate text-xs text-text-secondary">{parentPath}</p>
                      </div>
                      <svg className="h-4 w-4 shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                      </svg>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
