"use client";

import Link from "next/link";
import { buildBreadcrumbs } from "@/lib/pathUtils";

interface BreadcrumbNavProps {
  currentPath: string;
}

export default function BreadcrumbNav({ currentPath }: BreadcrumbNavProps) {
  const breadcrumbs = buildBreadcrumbs(currentPath);

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border px-4 py-3 text-sm">
      <Link
        href="/"
        className="shrink-0 rounded px-1.5 py-0.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.path} className="flex items-center gap-1">
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
          {index === breadcrumbs.length - 1 ? (
            <span className="shrink-0 rounded px-1.5 py-0.5 font-medium">
              {crumb.name}
            </span>
          ) : (
            <Link
              href={`/files/${crumb.path}`}
              className="shrink-0 rounded px-1.5 py-0.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
            >
              {crumb.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
