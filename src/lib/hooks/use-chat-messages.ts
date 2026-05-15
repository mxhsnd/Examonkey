"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";

export function useChatMessages(conversationId: string | null, courseId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>();
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !courseId) { setMessages([]); setLoading(false); return; }
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}&courseId=${courseId}`);
      const data = await res.json();
      setMessages(data);
    } finally {
      setLoading(false);
    }
  }, [conversationId, courseId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  async function addMessage(
    conversationId: string,
    courseId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<string> {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, courseId, role, content }),
    });
    const msg = await res.json();
    await fetchMessages();
    return msg.id;
  }

  async function updateMessage(id: string, content: string) {
    // For streaming updates, we update local state directly
    setMessages((prev) =>
      prev?.map((m) => (m.id === id ? { ...m, content } : m))
    );
  }

  return { messages, loading, addMessage, updateMessage, refetch: fetchMessages };
}
