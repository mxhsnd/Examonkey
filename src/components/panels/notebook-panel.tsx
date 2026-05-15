"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useKnowledge } from "@/lib/hooks/use-knowledge";
import { toast } from "sonner";
import { NotebookPen, Plus, Pencil, Trash2, FileUp, PenLine } from "lucide-react";
import type { KnowledgeEntry } from "@/lib/types";

export function NotebookPanel({ courseId }: { courseId: string }) {
  const { entries, addEntry, updateEntry, deleteEntry } = useKnowledge(courseId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function openCreate() {
    setEditing(null);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  }

  function openEdit(entry: KnowledgeEntry) {
    setEditing(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }
    if (editing?.id) {
      await updateEntry(editing.id, { title: title.trim(), content: content.trim() });
      toast.success("已更新");
    } else {
      await addEntry(title.trim(), content.trim());
      toast.success("已添加");
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这条笔记？")) return;
    await deleteEntry(id);
    toast.success("已删除");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4" />
          <h3 className="font-semibold text-sm">笔记本</h3>
        </div>
        <Button onClick={openCreate} size="sm" variant="ghost" className="h-7 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />
          添加
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {(!entries || entries.length === 0) ? (
            <div className="text-center text-muted-foreground py-8">
              <NotebookPen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">暂无笔记</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="group rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium truncate text-xs">{entry.title}</span>
                      <Badge variant="secondary" className="shrink-0 text-[10px] px-1 py-0">
                        {entry.source === "upload" ? (
                          <><FileUp className="h-2.5 w-2.5 mr-0.5" />上传</>
                        ) : (
                          <><PenLine className="h-2.5 w-2.5 mr-0.5" />手动</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{entry.content}</p>
                  </div>
                  <div className="hidden group-hover:flex gap-0.5 shrink-0">
                    <button
                      className="rounded p-1 hover:bg-accent"
                      onClick={() => openEdit(entry)}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded p-1 hover:bg-accent text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑条目" : "添加条目"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="知识内容..."
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
