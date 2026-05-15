"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { SYSTEM_PROMPTS } from "@/lib/ai";
import { CourseGuard } from "@/components/course-guard";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ReferencePicker } from "@/components/reference-picker";
import { toast } from "sonner";
import type { Conversation, ChatMessage } from "@/lib/types";
import {
  Upload,
  FileText,
  Loader2,
  Target,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Send,
  Square,
  Bot,
  User,
  Plus,
  History,
  Trash2,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  quickReplies?: { label: string; message: string }[];
}

const ANALYSIS_PROMPT = `你是一个考试分析专家。请分析以下往年试卷内容，输出一份完整的结构化分析报告。

输出要求（JSON 格式）：
{
  "summary": "一句话概括这份试卷的整体情况（题型数量、总分、难度等）",
  "sections": [
    { "key": "题型分析", "description": "各题型的分布、分值占比、难度" },
    { "key": "知识点分析", "description": "高频考点、知识点覆盖范围" },
    { "key": "答题策略", "description": "时间分配、答题顺序、得分技巧" },
    { "key": "...", "description": "..." }
  ]
}

sections 数组中至少包含 3-6 个分析维度，根据试卷实际内容决定。每个 section 的 key 是简短标题，description 是一句话说明这部分包含什么。

只输出 JSON，不要输出其他内容。`;

export default function ExamAnalysisPage() {
  const { currentCourseId } = useAppStore();
  const [files, setFiles] = useState<File[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [analysisContext, setAnalysisContext] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(true);
  const [input, setInput] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Persistence state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<Conversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchHistory = useCallback(async () => {
    if (!currentCourseId) return;
    try {
      const res = await fetch(`/api/conversations?courseId=${currentCourseId}&type=exam-analysis`);
      const data: Conversation[] = await res.json();
      data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setHistoryList(data);
    } catch { /* ignore */ }
  }, [currentCourseId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

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

  async function getFullContent(): Promise<string> {
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
    return fullContent;
  }

  async function createConversation(title: string, context: string): Promise<string> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: currentCourseId,
        title,
        type: "exam-analysis",
        metadata: { analysisContext: context },
      }),
    });
    const conv = await res.json();
    setConversationId(conv.id);
    fetchHistory();
    return conv.id;
  }

  async function saveMessage(convId: string, role: "user" | "assistant", content: string) {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: convId,
        courseId: currentCourseId,
        role,
        content,
      }),
    });
  }

  async function handleStartAnalysis() {
    if (!extractedText.trim() && selectedRefIds.length === 0) {
      toast.error("请先上传往年试卷或选择参考文件");
      return;
    }
    setAnalyzing(true);

    try {
      const fullContent = await getFullContent();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: ANALYSIS_PROMPT,
          messages: [{ role: "user", content: fullContent }],
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
          result += decoder.decode(value, { stream: true });
        }
      }

      let parsed: { summary: string; sections: { key: string; description: string }[] };
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result);
      } catch {
        parsed = {
          summary: "试卷分析完成",
          sections: [
            { key: "题型分析", description: "各题型的分布和分值占比" },
            { key: "知识点分析", description: "高频考点和知识点覆盖" },
            { key: "答题策略", description: "时间分配和得分技巧" },
          ],
        };
      }

      setAnalysisContext(fullContent);
      setChatStarted(true);

      const quickReplies = parsed.sections.map((s) => ({
        label: s.key,
        message: `请详细分析一下「${s.key}」：${s.description}`,
      }));

      const greeting = `分析完成。${parsed.summary}\n\n你想深入了解哪个方面？`;
      setMessages([
        {
          role: "assistant",
          content: greeting,
          quickReplies,
        },
      ]);

      // Persist: create conversation and save the greeting
      const title = files.length > 0
        ? `真题分析: ${files.map(f => f.name).join(", ").slice(0, 40)}`
        : "真题分析";
      const convId = await createConversation(title, fullContent);
      await saveMessage(convId, "assistant", greeting);
    } catch (err) {
      toast.error("分析失败: " + (err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleStop() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  }

  async function handleSend(text?: string) {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;

    const newUserMessage: Message = { role: "user", content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // Persist user message
    if (conversationId) {
      await saveMessage(conversationId, "user", userMessage);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const systemPrompt = `${SYSTEM_PROMPTS.examAnalysis}\n\n以下是试卷原文供你参考：\n${analysisContext}`;

      const apiMessages = updatedMessages
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: apiMessages,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      if (reader) {
        setMessages([...updatedMessages, { role: "assistant", content: "" }]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
          setMessages([...updatedMessages, { role: "assistant", content: result }]);
        }
      }

      // Persist assistant message
      if (conversationId && result) {
        await saveMessage(conversationId, "assistant", result);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast.error("回复失败: " + (err as Error).message);
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  async function handleLoadConversation(conv: Conversation) {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/messages?conversationId=${conv.id}&courseId=${currentCourseId}`);
      const data: ChatMessage[] = await res.json();

      const context = (conv.metadata?.analysisContext as string) || "";
      setAnalysisContext(context);
      setConversationId(conv.id);
      setChatStarted(true);
      setMessages(data.map((m) => ({ role: m.role, content: m.content })));
      setHistoryOpen(false);
    } catch {
      toast.error("加载对话失败");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}?courseId=${currentCourseId}`, { method: "DELETE" });
    setHistoryList((prev) => prev.filter((c) => c.id !== id));
    if (conversationId === id) {
      handleNewAnalysis();
    }
    toast.success("已删除");
  }

  function handleNewAnalysis() {
    setConversationId(null);
    setChatStarted(false);
    setMessages([]);
    setAnalysisContext("");
    setFiles([]);
    setExtractedText("");
    setSelectedRefIds([]);
  }

  return (
    <CourseGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            往年真题分析
          </h2>
          <p className="text-muted-foreground">
            上传往年试卷，AI 分析题型规律、高频考点、解题套路
          </p>
        </div>
        <div className="flex items-center gap-2">
          {chatStarted && (
            <Button variant="outline" size="sm" onClick={handleNewAnalysis}>
              <Plus className="h-4 w-4 mr-1" />
              新建分析
            </Button>
          )}
          {historyList.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <History className="h-4 w-4 mr-1" />
              历史 ({historyList.length})
            </Button>
          )}
        </div>
      </div>

      {/* History panel */}
      {historyOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">历史分析记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loadingHistory && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </div>
            )}
            {historyList.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleLoadConversation(conv)}
                className="group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{conv.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="hidden group-hover:block shrink-0 rounded p-0.5 hover:bg-background"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!chatStarted && (
        <>
          {/* 上传往年试卷 */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setUploadOpen(!uploadOpen)}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                {uploadOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Upload className="h-4 w-4" />
                上传往年试卷
                {files.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{files.length} 份</Badge>
                )}
              </CardTitle>
            </CardHeader>
            {uploadOpen && (
              <CardContent className="space-y-4 pt-0">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
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
                      支持多份试卷（PDF、图片、文本）
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
              </CardContent>
            )}
          </Card>

          {/* 从参考文件选择 */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setRefOpen(!refOpen)}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                {refOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <FolderOpen className="h-4 w-4" />
                从参考文件选择
                {selectedRefIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{selectedRefIds.length} 个</Badge>
                )}
              </CardTitle>
            </CardHeader>
            {refOpen && (
              <CardContent className="pt-0">
                <ReferencePicker
                  selectedIds={selectedRefIds}
                  onSelectionChange={setSelectedRefIds}
                />
              </CardContent>
            )}
          </Card>

          {/* 开始分析按钮 */}
          <Button
            onClick={handleStartAnalysis}
            disabled={analyzing || (!extractedText.trim() && selectedRefIds.length === 0)}
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                正在分析...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                开始分析
              </>
            )}
          </Button>
        </>
      )}

      {/* Chat area */}
      {chatStarted && (
        <Card className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2" : ""}`}>
                  {msg.role === "assistant" ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {msg.quickReplies.map((qr, j) => (
                        <Button
                          key={j}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSend(qr.message)}
                          className="text-xs"
                        >
                          {qr.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="继续追问..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button
                onClick={() => loading ? handleStop() : handleSend()}
                disabled={!loading && !input.trim()}
                size="icon"
                className="shrink-0 h-[44px] w-[44px]"
                variant={loading ? "destructive" : "default"}
              >
                {loading ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
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
