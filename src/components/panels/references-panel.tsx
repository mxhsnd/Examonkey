"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useReferences } from "@/lib/hooks/use-references";
import { toast } from "sonner";
import {
  FolderOpen,
  Upload,
  Plus,
  Trash2,
  FileText,
  Image,
  File,
  Loader2,
} from "lucide-react";

export function ReferencesPanel({ courseId }: { courseId: string }) {
  const { entries, addFile, addText, deleteEntry } = useReferences(courseId);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("courseId", courseId);
        formData.append("title", file.name.replace(/\.[^.]+$/, ""));
        formData.append("category", "reference");
        formData.append("file", file);
        await addFile(formData);
      }
      toast.success(`已上传 ${files.length} 个文件`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSaveText() {
    if (!title.trim() || !content.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }
    try {
      await addText(title.trim(), content.trim(), "reference");
      toast.success("已添加");
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除？")) return;
    await deleteEntry(id);
    toast.success("已删除");
  }

  function getFileIcon(mimeType?: string) {
    if (mimeType?.startsWith("image")) return <Image className="h-3.5 w-3.5" />;
    if (mimeType?.includes("pdf")) return <FileText className="h-3.5 w-3.5" />;
    return <File className="h-3.5 w-3.5" />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">参考文件</h3>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs relative"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            上传
            <input
              type="file"
              multiple
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleUpload}
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
            />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs"
            onClick={() => { setTitle(""); setContent(""); setDialogOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            文本
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">暂无参考文件</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
              >
                {getFileIcon(entry.mimeType)}
                <span className="flex-1 truncate">{entry.title}</span>
                <button
                  className="hidden group-hover:block rounded p-0.5 hover:bg-background text-destructive"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加文本</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="输入内容（支持 Markdown）..."
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveText} disabled={!title.trim() || !content.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
