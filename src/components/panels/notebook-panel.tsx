"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useKnowledge } from "@/lib/hooks/use-knowledge";
import { useAppStore, useLearningNoteId } from "@/lib/store";
import { BlockEditor } from "@/components/block-editor";
import { toast } from "sonner";
import {
  NotebookPen,
  Plus,
  Trash2,
  ArrowLeft,
  FileText,
} from "lucide-react";
import type { KnowledgeEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NotebookPanel({ courseId }: { courseId: string }) {
  const { entries, addEntry, updateEntry, deleteEntry } = useKnowledge(courseId);
  const { setLearningNoteId } = useAppStore();
  const learningNoteId = useLearningNoteId();

  const [selectedId, setSelectedIdLocal] = useState<string | null>(learningNoteId);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCourseRef = useRef(courseId);

  function setSelectedId(id: string | null) {
    setSelectedIdLocal(id);
    setLearningNoteId(id);
  }

  // Reset when course changes
  useEffect(() => {
    if (courseId !== prevCourseRef.current) {
      prevCourseRef.current = courseId;
      setSelectedIdLocal(null);
      setEditContent("");
      setEditTitle("");
    }
  }, [courseId]);

  // Sync from store when learningNoteId changes (e.g. course switch restores previous note)
  useEffect(() => {
    setSelectedIdLocal(learningNoteId);
  }, [learningNoteId]);

  const selected = entries?.find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setEditContent(selected.content);
      setEditTitle(selected.title);
    }
  }, [selectedId]);

  // Sync if entry changes externally (AI modified)
  useEffect(() => {
    if (selected && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
      setEditContent(selected.content);
      setEditTitle(selected.title);
    }
  }, [selected?.content, selected?.title]);

  const autoSave = useCallback(
    (title: string, content: string) => {
      if (!selected) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateEntry(selected.id, { title: title.trim() || selected.title, content });
      }, 500);
    },
    [selected, updateEntry]
  );

  function handleContentChange(value: string) {
    setEditContent(value);
    autoSave(editTitle, value);
  }

  function handleTitleChange(value: string) {
    setEditTitle(value);
    autoSave(value, editContent);
  }

  function openNote(entry: KnowledgeEntry) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setSelectedId(entry.id);
    setEditContent(entry.content);
    setEditTitle(entry.title);
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm("确定删除这条笔记？")) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await deleteEntry(selected.id);
    setSelectedId(null);
    toast.success("已删除");
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }
    await addEntry(newTitle.trim(), newContent.trim());
    setCreateOpen(false);
    setNewTitle("");
    setNewContent("");
    toast.success("已创建");
  }

  // Note opened — block editor
  if (selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <Input
              value={editTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xs font-semibold h-6 border-none shadow-none px-0 focus-visible:ring-0 flex-1"
              placeholder="笔记标题"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-destructive hover:text-destructive shrink-0"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <BlockEditor
            content={editContent}
            onChange={handleContentChange}
            className="compact"
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4" />
          <h3 className="font-semibold text-sm">笔记本</h3>
        </div>
        <Button
          onClick={() => {
            setNewTitle("");
            setNewContent("");
            setCreateOpen(true);
          }}
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          添加
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {(!entries || entries.length === 0) ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">暂无笔记</p>
            <p className="text-xs mt-1 opacity-70">点击添加创建第一条笔记</p>
          </div>
        ) : (
          <div className="py-1">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => openNote(entry)}
                className={cn(
                  "w-full text-left px-4 py-2 transition-colors",
                  "hover:bg-accent/50"
                )}
              >
                <p className="text-xs font-medium truncate">{entry.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {entry.content.slice(0, 60)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建笔记</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="标题"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="内容（支持 Markdown）..."
              rows={8}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newContent.trim()}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
