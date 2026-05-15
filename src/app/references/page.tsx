"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useReferences, type ReferenceFile } from "@/lib/hooks/use-references";
import { toast } from "sonner";
import {
  FolderOpen,
  Upload,
  Plus,
  Trash2,
  FileText,
  Image,
  BookOpen,
  File,
  Loader2,
} from "lucide-react";

export default function ReferencesPage() {
  const { currentCourseId } = useAppStore();
  const { entries, loading, addFile, addText, deleteEntry } = useReferences(currentCourseId);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCategory, setDialogCategory] = useState<"knowledge" | "reference">("knowledge");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const knowledgeFiles = entries.filter((e) => e.category === "knowledge");
  const referenceFiles = entries.filter((e) => e.category === "reference");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, category: "knowledge" | "reference") {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("courseId", String(currentCourseId));
        formData.append("title", file.name.replace(/\.[^.]+$/, ""));
        formData.append("category", category);
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

  function openTextDialog(category: "knowledge" | "reference") {
    setDialogCategory(category);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  }

  async function handleSaveText() {
    if (!title.trim() || !content.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }
    try {
      await addText(title.trim(), content.trim(), dialogCategory);
      toast.success("已保存");
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(entry: ReferenceFile) {
    if (!confirm(`确定删除「${entry.title}」？`)) return;
    await deleteEntry(entry.id);
    toast.success("已删除");
  }

  function getIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType === "application/pdf") return FileText;
    return File;
  }

  function renderFileList(files: ReferenceFile[], category: "knowledge" | "reference") {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="file"
              multiple
              accept=".pdf,image/*,.txt,.md"
              onChange={(e) => handleUpload(e, category)}
              className="hidden"
              id={`upload-${category}`}
            />
            <label htmlFor={`upload-${category}`} className="cursor-pointer inline-flex items-center justify-center gap-1 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <Upload className="h-4 w-4" />
              上传文件
            </label>
          </div>
          <Button variant="outline" className="gap-1" onClick={() => openTextDialog(category)}>
            <Plus className="h-4 w-4" />
            添加文本
          </Button>
        </div>

        {/* PLACEHOLDER_LIST */}
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在上传...
          </div>
        )}

        {files.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无文件</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {files.map((entry) => {
              const Icon = getIcon(entry.mimeType);
              return (
                <Card key={entry.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium truncate">{entry.title}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {entry.mimeType === "text/markdown" ? "文本" : entry.mimeType.split("/")[1]?.toUpperCase()}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(entry)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // PLACEHOLDER_RETURN

  return (
    <CourseGuard>
      <PageWrapper>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            参考文件
          </h2>
          <p className="text-muted-foreground">
            管理课程的知识文件和参考资料，可在总结和分析时直接引用
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="knowledge">
              <TabsList className="mb-4">
                <TabsTrigger value="knowledge" className="gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  知识文件
                  {knowledgeFiles.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{knowledgeFiles.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reference" className="gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  参考文件
                  {referenceFiles.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{referenceFiles.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="knowledge">
                {renderFileList(knowledgeFiles, "knowledge")}
              </TabsContent>
              <TabsContent value="reference">
                {renderFileList(referenceFiles, "reference")}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

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
              placeholder="输入内容（支持 Markdown 格式）..."
              rows={10}
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
      </PageWrapper>
    </CourseGuard>
  );
}