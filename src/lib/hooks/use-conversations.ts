"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function useConversations(courseId: number | null) {
  const conversations = useLiveQuery(
    () =>
      courseId
        ? db.conversations.where("courseId").equals(courseId).reverse().sortBy("updatedAt")
        : [],
    [courseId]
  );

  async function createConversation(courseId: number, title = "新对话"): Promise<number> {
    const now = new Date();
    return db.conversations.add({
      courseId,
      title,
      createdAt: now,
      updatedAt: now,
    }) as Promise<number>;
  }

  async function updateTitle(id: number, title: string) {
    await db.conversations.update(id, { title, updatedAt: new Date() });
  }

  async function deleteConversation(id: number) {
    await db.transaction("rw", [db.conversations, db.chatMessages], async () => {
      await db.chatMessages.where("conversationId").equals(id).delete();
      await db.conversations.delete(id);
    });
  }

  return { conversations, createConversation, updateTitle, deleteConversation };
}
