import AppShell from "@/components/AppShell";
import Link from "next/link";
import { STORAGE_DRIVES } from "@/lib/constants";

export default function Home() {
  return (
    <AppShell>
      <div className="p-6">
        <h2 className="mb-6 text-2xl font-bold">Storage Drives</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STORAGE_DRIVES.map((drive) => (
            <Link
              key={drive.id}
              href={`/files/${drive.id}`}
              className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="mb-3 flex items-center gap-3">
                {drive.icon === "ssd" ? (
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
                        d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z"
                      />
                    </svg>
                  </div>
                ) : (
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
                        d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold group-hover:text-primary">
                    {drive.name}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {drive.description}
                  </p>
                </div>
              </div>
              <div className="text-sm text-text-secondary">
                /data/{drive.id}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
