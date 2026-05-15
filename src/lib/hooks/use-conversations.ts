"use client";

import { useState, useEffect, useCallback } from "react";
import type { Conversation } from "@/lib/types";

export function useConversations(courseId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>();
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!courseId) { setConversations([]); setLoading(false); return; }
    try {
      const res = await fetch(`/api/conversations?courseId=${courseId}`);
      const data = await res.json();
      data.sort((a: Conversation, b: Conversation) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  async function createConversation(courseId: string, title = "新对话"): Promise<string> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title }),
    });
    const conv = await res.json();
    await fetchConversations();
    return conv.id;
  }

  async function updateTitle(id: string, title: string) {
    if (!courseId) return;
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title }),
    });
    await fetchConversations();
  }

  async function deleteConversation(id: string) {
    if (!courseId) return;
    await fetch(`/api/conversations/${id}?courseId=${courseId}`, { method: "DELETE" });
    await fetchConversations();
  }

  return { conversations, loading, createConversation, updateTitle, deleteConversation, refetch: fetchConversations };
}
