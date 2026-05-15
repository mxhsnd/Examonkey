"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  currentCourseId: string | null;
  currentConversationId: string | null;
  sidebarOpen: boolean;
  setCurrentCourseId: (id: string | null) => void;
  setCurrentConversationId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentCourseId: null,
      currentConversationId: null,
      sidebarOpen: true,
      setCurrentCourseId: (id) => set({ currentCourseId: id, currentConversationId: null }),
      setCurrentConversationId: (id) => set({ currentConversationId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: "examonkey-store" }
  )
);
