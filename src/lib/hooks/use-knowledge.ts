"use client";

import { useState, useEffect, useCallback } from "react";
import type { KnowledgeEntry } from "@/lib/types";

function sortEntries(entries: KnowledgeEntry[]) {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function useKnowledge(courseId: string | null) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>();
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!courseId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/knowledge?courseId=${courseId}`);
      const data = await res.json();
      setEntries(sortEntries(data));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function addEntry(title: string, content: string) {
    if (!courseId) return null;

    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, source: "manual", title, content }),
    });
    const entry = await res.json() as KnowledgeEntry;
    setEntries((prev) => sortEntries([...(prev ?? []), entry]));
    return entry;
  }

  async function updateEntry(id: string, data: Partial<Pick<KnowledgeEntry, "title" | "content">>) {
    if (!courseId) return null;

    const res = await fetch(`/api/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, ...data }),
    });
    const updatedEntry = await res.json() as KnowledgeEntry;

    setEntries((prev) =>
      (prev ?? []).map((entry) => (entry.id === id ? updatedEntry : entry))
    );

    return updatedEntry;
  }

  async function deleteEntry(id: string) {
    if (!courseId) return;

    await fetch(`/api/knowledge/${id}?courseId=${courseId}`, { method: "DELETE" });
    setEntries((prev) => (prev ?? []).filter((entry) => entry.id !== id));
  }

  return { entries, loading, addEntry, updateEntry, deleteEntry };
}
