"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type ChatMessage } from "@/lib/db";

export function useChatMessages(conversationId: number | null) {
  const messages = useLiveQuery(
    () =>
      conversationId
        ? db.chatMessages.where("conversationId").equals(conversationId).sortBy("createdAt")
        : [],
    [conversationId]
  );

  async function addMessage(
    conversationId: number,
    courseId: number,
    role: "user" | "assistant",
    content: string
  ): Promise<number> {
    const id = await db.chatMessages.add({
      conversationId,
      courseId,
      role,
      content,
      createdAt: new Date(),
    }) as number;
    await db.conversations.update(conversationId, { updatedAt: new Date() });
    return id;
  }

  async function updateMessage(id: number, content: string) {
    await db.chatMessages.update(id, { content });
  }

  return { messages, addMessage, updateMessage };
}
