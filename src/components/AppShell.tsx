"use client";

import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto pb-[var(--safe-area-bottom)]">
          {children}
        </main>
      </div>
    </>
  );
}
