"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import { SYSTEM_PROMPTS } from "@/lib/ai";
import { CourseGuard } from "@/components/course-guard";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ReferencePicker } from "@/components/reference-picker";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Image,
  Type,
  Loader2,
  Sparkles,
  BookOpen,
  FolderOpen,
} from "lucide-react";

export default function HomePage() {
  const { currentCourseId } = useAppStore();
  const [inputText, setInputText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;
      setFiles(selectedFiles);
      setExtracting(true);

      try {
        let text = "";
        for (const file of selectedFiles) {
          let fileText = "";
          if (file.type === "application/pdf") {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/parse", {
              method: "POST",
              body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "PDF 解析失败");
            fileText = data.text;
          } else if (file.type.startsWith("image/")) {
            const base64 = await fileToBase64(file);
            fileText = `[图片: ${file.name}]\n{{IMAGE:${base64}}}`;
          } else {
            fileText = await file.text();
          }

          text += fileText + "\n\n";

          if (currentCourseId && fileText.trim()) {
            await fetch("/api/knowledge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                courseId: currentCourseId,
                source: "upload",
                title: file.name,
                content: fileText,
                fileName: file.name,
              }),
            });
          }
        }
        setExtractedText(text);
        toast.success(`已解析 ${selectedFiles.length} 个文件并存入知识库`);
      } catch (err) {
        toast.error("文件解析出错: " + (err as Error).message);
      } finally {
        setExtracting(false);
      }
    },
    [currentCourseId]
  );

  async function handleSummarize() {
    const content = extractedText || inputText;
    if (!content.trim() && selectedRefIds.length === 0) {
      toast.error("请先上传课件、输入内容或选择参考文件");
      return;
    }
    setLoading(true);
    setSummary("");

    try {
      let fullContent = content;

      if (selectedRefIds.length > 0) {
        const refTexts = await Promise.all(
          selectedRefIds.map(async (id) => {
            const res = await fetch(`/api/references/${id}?courseId=${currentCourseId}`);
            if (!res.ok) return "";
            const data = await res.json();
            return data.textContent || "";
          })
        );
        const refContent = refTexts.filter(Boolean).join("\n\n---\n\n");
        fullContent = fullContent ? `${fullContent}\n\n---\n\n${refContent}` : refContent;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPTS.summarize,
          messages: [{ role: "user", content: `请分析以下课件内容并生成复习笔记：\n\n${fullContent}` }],
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setSummary(result);
        }
      }
    } catch (err) {
      toast.error("AI 生成失败: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <CourseGuard>
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          课件智能总结
        </h2>
        <p className="text-muted-foreground">
          上传课件或粘贴内容，AI 帮你生成结构化复习笔记
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>输入课件内容</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload">
            <TabsList className="mb-4">
              <TabsTrigger value="upload" className="gap-1">
                <Upload className="h-3.5 w-3.5" />
                上传文件
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-1">
                <Type className="h-3.5 w-3.5" />
                粘贴文本
              </TabsTrigger>
              <TabsTrigger value="references" className="gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
                参考文件
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    点击上传或拖拽文件到此处
                  </p>
                  <p className="text-xs text-muted-foreground">
                    支持 PDF、图片、文本文件
                  </p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {f.type.startsWith("image/") ? (
                        <Image className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      {f.name}
                    </Badge>
                  ))}
                </div>
              )}

              {extracting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在解析文件...
                </div>
              )}
            </TabsContent>

            <TabsContent value="text">
              <Textarea
                placeholder="粘贴课件内容、笔记、或任何需要总结的学习材料..."
                rows={10}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="references">
              <ReferencePicker
                selectedIds={selectedRefIds}
                onSelectionChange={setSelectedRefIds}
              />
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleSummarize}
            disabled={loading || (!extractedText && !inputText.trim() && selectedRefIds.length === 0)}
            className="w-full mt-4 gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "AI 正在生成..." : "生成智能总结"}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI 复习笔记
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={summary} />
          </CardContent>
        </Card>
      )}
    </div>
    </CourseGuard>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
