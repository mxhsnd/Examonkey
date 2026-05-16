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
import { CourseGuard } from "@/components/course-guard";
import { useAppStore } from "@/lib/store";
import { useKnowledge } from "@/lib/hooks/use-knowledge";
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

export default function NotebookPage() {
  const { currentCourseId, sidebarOpen } = useAppStore();
  const { entries, addEntry, updateEntry, deleteEntry } =
    useKnowledge(currentCourseId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = entries?.find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setEditContent(selected.content);
      setEditTitle(selected.title);
    }
  }, [selectedId]);

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

  return (
    <CourseGuard>
      <div
        className={cn(
          "fixed inset-0 flex transition-all duration-200",
          sidebarOpen ? "left-56" : "left-14"
        )}
      >
        {/* Left: note list */}
        <div className="w-64 shrink-0 border-r flex flex-col bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4" />
              <span className="font-semibold text-sm">笔记本</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => {
                setNewTitle("");
                setNewContent("");
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(!entries || entries.length === 0) ? (
              <div className="text-center text-muted-foreground py-12 px-4">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">暂无笔记</p>
                <p className="text-xs mt-1 opacity-70">点击 + 创建第一条笔记</p>
              </div>
            ) : (
              <div className="py-2">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => openNote(entry)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 transition-colors",
                      "hover:bg-accent/50",
                      selectedId === entry.id &&
                        "bg-accent text-accent-foreground"
                    )}
                  >
                    <p className="text-sm font-medium truncate">
                      {entry.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {entry.content.slice(0, 50)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: note content */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <NotebookPen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">选择一条笔记查看内容</p>
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0 lg:hidden"
                    onClick={() => setSelectedId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Input
                    value={editTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-lg font-semibold h-8 border-none shadow-none px-0 focus-visible:ring-0"
                    placeholder="笔记标题"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Content area — block editor */}
              <div className="flex-1 overflow-y-auto p-6">
                <BlockEditor
                  content={editContent}
                  onChange={handleContentChange}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create dialog */}
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
              rows={10}
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
    </CourseGuard>
  );
}
