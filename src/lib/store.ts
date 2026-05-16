"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  currentCourseId: string | null;
  currentConversationId: string | null;
  sidebarOpen: boolean;
  learningConversationIds: Record<string, string | null>;
  learningNoteIds: Record<string, string | null>;
  setCurrentCourseId: (id: string | null) => void;
  setCurrentConversationId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setLearningConversationId: (id: string | null) => void;
  setLearningNoteId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentCourseId: null,
      currentConversationId: null,
      sidebarOpen: true,
      learningConversationIds: {},
      learningNoteIds: {},
      setCurrentCourseId: (id) => set({ currentCourseId: id, currentConversationId: null }),
      setCurrentConversationId: (id) => set({ currentConversationId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setLearningConversationId: (id) => {
        const courseId = get().currentCourseId;
        if (!courseId) return;
        set((s) => ({ learningConversationIds: { ...s.learningConversationIds, [courseId]: id } }));
      },
      setLearningNoteId: (id) => {
        const courseId = get().currentCourseId;
        if (!courseId) return;
        set((s) => ({ learningNoteIds: { ...s.learningNoteIds, [courseId]: id } }));
      },
    }),
    { name: "examonkey-store" }
  )
);

// Derived selectors
export function useLearningConversationId() {
  return useAppStore((s) => s.currentCourseId ? (s.learningConversationIds[s.currentCourseId] ?? null) : null);
}

export function useLearningNoteId() {
  return useAppStore((s) => s.currentCourseId ? (s.learningNoteIds[s.currentCourseId] ?? null) : null);
}
