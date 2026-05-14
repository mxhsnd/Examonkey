"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type KnowledgeEntry } from "@/lib/db";

export function useKnowledge(courseId: number | null) {
  const entries = useLiveQuery(
    () =>
      courseId
        ? db.knowledgeEntries.where("courseId").equals(courseId).reverse().sortBy("createdAt")
        : [],
    [courseId]
  );

  async function addEntry(title: string, content: string) {
    if (!courseId) return;
    await db.knowledgeEntries.add({
      courseId,
      source: "manual",
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async function updateEntry(id: number, data: Partial<Pick<KnowledgeEntry, "title" | "content">>) {
    await db.knowledgeEntries.update(id, { ...data, updatedAt: new Date() });
  }

  async function deleteEntry(id: number) {
    await db.knowledgeEntries.delete(id);
  }

  return { entries, addEntry, updateEntry, deleteEntry };
}
