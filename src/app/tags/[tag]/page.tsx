"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";

interface TagEntry {
  path: string;
  data: { favorite?: boolean; tags?: string[] };
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

function getParentPath(filePath: string): string {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

export default function TagPage() {
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);
  const [files, setFiles] = useState<TagEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/files/tags?tag=${encodeURIComponent(tag)}`)
      .then((res) => res.json())
      .then((data) => setFiles(data.files || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tag]);

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            <h2 className="text-lg font-semibold">{tag}</h2>
            {!loading && (
              <span className="text-sm text-text-secondary">({files.length})</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-text-secondary/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
              </svg>
              <p className="mt-2 text-sm text-text-secondary">
                No files tagged with &quot;{tag}&quot;
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-border">
              {files.map((entry) => {
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
                      {/* タグバッジ */}
                      <div className="flex shrink-0 gap-1">
                        {entry.data.tags?.map((t) => (
                          <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            {t}
                          </span>
                        ))}
                      </div>
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
