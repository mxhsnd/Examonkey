"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CourseGuard } from "@/components/course-guard";
import { PageWrapper } from "@/components/page-wrapper";
import { useAppStore } from "@/lib/store";
import { useKnowledge } from "@/lib/hooks/use-knowledge";
import { toast } from "sonner";
import { NotebookPen, Plus, Pencil, Trash2, FileUp, PenLine } from "lucide-react";
import type { KnowledgeEntry } from "@/lib/types";

export default function NotebookPage() {
  const { currentCourseId } = useAppStore();
  const { entries, addEntry, updateEntry, deleteEntry } = useKnowledge(currentCourseId);
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
    <CourseGuard>
      <PageWrapper>
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between shrink-0 pb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <NotebookPen className="h-6 w-6" />
              笔记本
            </h2>
            <p className="text-muted-foreground">
              管理当前课程的知识条目，AI 将基于这些内容回答问题
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1">
            <Plus className="h-4 w-4" />
            添加条目
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
        {(!entries || entries.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <NotebookPen className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>暂无笔记</p>
              <p className="text-xs mt-1">上传课件或手动添加内容来构建知识库</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{entry.title}</h3>
                        <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                          {entry.source === "upload" ? (
                            <><FileUp className="h-3 w-3" />上传</>
                          ) : (
                            <><PenLine className="h-3 w-3" />手动</>
                          )}
                        </Badge>
                      </div>
                      {entry.fileName && (
                        <p className="text-xs text-muted-foreground mb-1">
                          来源: {entry.fileName}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {entry.content}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(entry)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑条目" : "添加条目"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="标题，如：第三章 微积分基本定理"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="知识内容..."
              rows={10}
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
      </PageWrapper>
    </CourseGuard>
  );
}
