"use client";

import { useState, useEffect, useCallback } from "react";
import type { KnowledgeEntry } from "@/lib/types";

export function useKnowledge(courseId: string | null) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>();
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!courseId) { setEntries([]); setLoading(false); return; }
    try {
      const res = await fetch(`/api/knowledge?courseId=${courseId}`);
      const data = await res.json();
      data.sort((a: KnowledgeEntry, b: KnowledgeEntry) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  async function addEntry(title: string, content: string) {
    if (!courseId) return;
    await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, source: "manual", title, content }),
    });
    await fetchEntries();
  }

  async function updateEntry(id: string, data: Partial<Pick<KnowledgeEntry, "title" | "content">>) {
    if (!courseId) return;
    await fetch(`/api/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, ...data }),
    });
    await fetchEntries();
  }

  async function deleteEntry(id: string) {
    if (!courseId) return;
    await fetch(`/api/knowledge/${id}?courseId=${courseId}`, { method: "DELETE" });
    await fetchEntries();
  }

  return { entries, loading, addEntry, updateEntry, deleteEntry };
}
