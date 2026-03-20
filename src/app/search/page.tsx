"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import SearchResults from "@/components/SearchResults";

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense>
        <SearchContent />
      </Suspense>
    </AppShell>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  return <SearchResults query={query} />;
}
