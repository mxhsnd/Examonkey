import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AISettings } from "@/lib/db";

interface AppState {
  currentCourseId: number | null;
  setCurrentCourse: (id: number | null) => void;

  currentConversationId: number | null;
  setCurrentConversation: (id: number | null) => void;

  aiSettings: AISettings | null;
  setAISettings: (settings: AISettings) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentCourseId: null,
      setCurrentCourse: (id) => set({ currentCourseId: id, currentConversationId: null }),

      currentConversationId: null,
      setCurrentConversation: (id) => set({ currentConversationId: id }),

      aiSettings: null,
      setAISettings: (settings) => set({ aiSettings: settings }),

      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: "examonkey-store",
      partialize: (state) => ({
        aiSettings: state.aiSettings,
        currentCourseId: state.currentCourseId,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);
