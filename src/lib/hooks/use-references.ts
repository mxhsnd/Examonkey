"use client";

import { useState, useEffect, useCallback } from "react";

export interface ReferenceFile {
  id: string;
  title: string;
  category: "knowledge" | "reference";
  fileName: string;
  mimeType: string;
  createdAt: string;
  textContent?: string;
}

export function useReferences(courseId: number | null) {
  const [entries, setEntries] = useState<ReferenceFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!courseId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/references?courseId=${courseId}`);
      if (res.ok) {
        setEntries(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function addFile(formData: FormData) {
    const res = await fetch("/api/references", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "上传失败");
    }
    await fetchEntries();
    return res.json();
  }

  async function addText(title: string, content: string, category: "knowledge" | "reference") {
    if (!courseId) return;
    const formData = new FormData();
    formData.append("courseId", String(courseId));
    formData.append("title", title);
    formData.append("category", category);
    formData.append("textInput", content);
    return addFile(formData);
  }

  async function deleteEntry(id: string) {
    if (!courseId) return;
    await fetch(`/api/references/${id}?courseId=${courseId}`, { method: "DELETE" });
    await fetchEntries();
  }

  async function getContent(id: string): Promise<string> {
    if (!courseId) return "";
    const res = await fetch(`/api/references/${id}?courseId=${courseId}`);
    if (!res.ok) return "";
    const data = await res.json();
    return data.textContent || "";
  }

  return { entries, loading, addFile, addText, deleteEntry, getContent, refetch: fetchEntries };
}
