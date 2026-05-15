"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className={cn("min-h-screen transition-all duration-200 p-6", sidebarOpen ? "ml-56" : "ml-14")}>
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
    </div>
  );
}
