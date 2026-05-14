"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { SYSTEM_PROMPTS } from "@/lib/ai";
import { CourseGuard } from "@/components/course-guard";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ReferencePicker } from "@/components/reference-picker";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  Target,
  TrendingUp,
  Lightbulb,
  FolderOpen,
} from "lucide-react";

export default function ExamAnalysisPage() {
  const { aiSettings, currentCourseId } = useAppStore();
  const [files, setFiles] = useState<File[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    setFiles(selectedFiles);
    setExtracting(true);

    try {
      let text = "";
      for (const file of selectedFiles) {
        if (file.type === "application/pdf") {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/parse", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("PDF 解析失败");
          const data = await res.json();
          text += `--- ${file.name} ---\n${data.text}\n\n`;
        } else if (file.type.startsWith("image/")) {
          const base64 = await fileToBase64(file);
          text += `[试卷图片: ${file.name}]\n{{IMAGE:${base64}}}\n\n`;
        } else {
          text += `--- ${file.name} ---\n${await file.text()}\n\n`;
        }
      }
      setExtractedText(text);
      toast.success(`已解析 ${selectedFiles.length} 份试卷`);
    } catch (err) {
      toast.error("文件解析出错: " + (err as Error).message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleAnalyze() {
    if (!extractedText.trim() && selectedRefIds.length === 0) {
      toast.error("请先上传往年试卷或选择参考文件");
      return;
    }
    if (!aiSettings?.apiKey) {
      toast.error("请先在设置中配置 API Key");
      return;
    }

    setLoading(true);
    setAnalysis("");

    try {
      let fullContent = extractedText;

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
          settings: aiSettings,
          systemPrompt: SYSTEM_PROMPTS.examAnalysis,
          messages: [
            {
              role: "user",
              content: `请分析以下往年试卷，总结题型规律和解题套路：\n\n${fullContent}`,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setAnalysis(result);
        }
      }
    } catch (err) {
      toast.error("分析失败: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <CourseGuard>
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6" />
          往年真题分析
        </h2>
        <p className="text-muted-foreground">
          上传往年试卷，AI 分析题型规律、高频考点、解题套路
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>上传往年试卷</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              multiple
              accept=".pdf,image/*,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="exam-upload"
            />
            <label htmlFor="exam-upload" className="cursor-pointer space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                上传往年试卷（支持多份，AI 会综合分析规律）
              </p>
              <p className="text-xs text-muted-foreground">
                支持 PDF、试卷照片、文本文件
              </p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {f.name}
                </Badge>
              ))}
            </div>
          )}

          {extracting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在解析试卷...
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FolderOpen className="h-4 w-4" />
              从参考文件选择
            </div>
            <ReferencePicker
              selectedIds={selectedRefIds}
              onSelectionChange={setSelectedRefIds}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || (!extractedText.trim() && selectedRefIds.length === 0)}
            className="w-full gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            {loading ? "AI 正在分析..." : "开始分析题型规律"}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              分析结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={analysis} />
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
