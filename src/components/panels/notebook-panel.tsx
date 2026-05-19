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
import { NoteMarkdownEditor } from "@/components/note-markdown-editor";
import { toast } from "sonner";
import { NotebookPen, Plus, Trash2, FileText } from "lucide-react";
import type { KnowledgeEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface NotebookState {
  entries: KnowledgeEntry[];
  selected: KnowledgeEntry | null;
  selectedId: string | null;
  editContent: string;
  editTitle: string;
  createOpen: boolean;
  newTitle: string;
  newContent: string;
  saveStatus: "idle" | "saving" | "saved";
  setCreateOpen: (open: boolean) => void;
  setNewTitle: (title: string) => void;
  setNewContent: (content: string) => void;
  handleCreate: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleContentChange: (value: string) => void;
  handleTitleChange: (value: string) => void;
  openNote: (entry: KnowledgeEntry) => void;
}

export function useNotebookState(courseId: string): NotebookState {
  const { entries, addEntry, updateEntry, deleteEntry } = useKnowledge(courseId);
  const { setLearningNoteId } = useAppStore();
  const learningNoteId = useLearningNoteId();

  const [selectedId, setSelectedIdLocal] = useState<string | null>(learningNoteId);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTokenRef = useRef(0);
  const prevCourseRef = useRef(courseId);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdLocal(id);
    setLearningNoteId(id);
  }, [setLearningNoteId]);

  useEffect(() => {
    if (courseId !== prevCourseRef.current) {
      prevCourseRef.current = courseId;
      setSelectedIdLocal(null);
      setDraftId(null);
      setEditContent("");
      setEditTitle("");
      setSaveStatus("idle");
    }
  }, [courseId]);

  useEffect(() => {
    setSelectedIdLocal(learningNoteId);
  }, [learningNoteId]);

  const safeEntries = entries ?? [];
  const selected = safeEntries.find((entry) => entry.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setDraftId(null);
      setEditContent("");
      setEditTitle("");
      setSaveStatus("idle");
      return;
    }

    if (selected.id !== draftId) {
      setDraftId(selected.id);
      setEditContent(selected.content);
      setEditTitle(selected.title);
      setSaveStatus("idle");
    }
  }, [selected, draftId]);

  const scheduleSave = useCallback((noteId: string, title: string, content: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const token = ++saveTokenRef.current;
    setSaveStatus("saving");

    debounceRef.current = setTimeout(async () => {
      try {
        await updateEntry(noteId, { title, content });
        if (saveTokenRef.current === token) {
          setSaveStatus("saved");
        }
      } catch {
        if (saveTokenRef.current === token) {
          setSaveStatus("idle");
        }
      }
    }, 500);
  }, [updateEntry]);

  function handleContentChange(value: string) {
    if (!selected) return;
    setEditContent(value);
    scheduleSave(selected.id, editTitle, value);
  }

  function handleTitleChange(value: string) {
    if (!selected) return;
    setEditTitle(value);
    scheduleSave(selected.id, value, editContent);
  }

  function openNote(entry: KnowledgeEntry) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setSelectedId(entry.id);
    setDraftId(entry.id);
    setEditContent(entry.content);
    setEditTitle(entry.title);
    setSaveStatus("idle");
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm("确定删除这条笔记？")) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await deleteEntry(selected.id);
    setSelectedId(null);
    setDraftId(null);
    setSaveStatus("idle");
    toast.success("已删除");
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }
    const entry = await addEntry(newTitle.trim(), newContent.trim());
    setCreateOpen(false);
    setNewTitle("");
    setNewContent("");
    toast.success("已创建");
    if (entry) {
      openNote(entry);
    }
  }

  return {
    entries: safeEntries,
    selected,
    selectedId,
    editContent,
    editTitle,
    createOpen,
    newTitle,
    newContent,
    saveStatus,
    setCreateOpen,
    setNewTitle,
    setNewContent,
    handleCreate,
    handleDelete,
    handleContentChange,
    handleTitleChange,
    openNote,
  };
}

export function NotebookSelectorPanel({ state }: { state: NotebookState }) {
  const {
    entries,
    selectedId,
    createOpen,
    newTitle,
    newContent,
    setCreateOpen,
    setNewTitle,
    setNewContent,
    handleCreate,
    openNote,
  } = state;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4" />
          <h3 className="font-semibold text-sm">笔记选择</h3>
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
        {entries.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-xs">暂无笔记</p>
            <p className="mt-1 text-xs opacity-70">点击添加创建第一条笔记</p>
          </div>
        ) : (
          <div className="py-1">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => openNote(entry)}
                className={cn(
                  "w-full px-4 py-2 text-left transition-colors hover:bg-accent/50",
                  selectedId === entry.id && "bg-accent"
                )}
              >
                <p className="truncate text-xs font-medium">{entry.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
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

export function NotebookEditorPanel({ state }: { state: NotebookState }) {
  const {
    selected,
    editContent,
    editTitle,
    saveStatus,
    handleDelete,
    handleContentChange,
    handleTitleChange,
  } = state;

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <NotebookPen className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">请选择一条笔记</p>
          <p className="mt-1 text-xs opacity-70">在左侧“笔记选择”区域打开要编辑的笔记</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-4 py-3">
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Input
              value={editTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="h-8 border-none bg-transparent px-0 text-base font-semibold tracking-[-0.01em] shadow-none focus-visible:ring-0 dark:bg-transparent"
              placeholder="笔记标题"
            />
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {saveStatus === "saving" ? "保存中..." : saveStatus === "saved" ? "已保存" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive shrink-0"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background/80 px-4 py-4">
        <NoteMarkdownEditor content={editContent} onChange={handleContentChange} />
      </div>
    </div>
  );
}

export function NotebookPanel({ state }: { state: NotebookState }) {
  return <NotebookEditorPanel state={state} />;
}
