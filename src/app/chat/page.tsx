"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { SYSTEM_PROMPTS } from "@/lib/ai";
import { db } from "@/lib/db";
import { CourseGuard } from "@/components/course-guard";
import { ConversationList } from "@/components/conversation-list";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useChatMessages } from "@/lib/hooks/use-chat-messages";
import { toast } from "sonner";
import { Send, Loader2, MessageCircle, Bot, User } from "lucide-react";

const MAX_CONTEXT_CHARS = 10000;

export default function ChatPage() {
  const { aiSettings, currentCourseId, currentConversationId, setCurrentConversation } = useAppStore();
  const { createConversation, updateTitle } = useConversations(currentCourseId);
  const { messages, addMessage, updateMessage } = useChatMessages(currentConversationId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  async function getKnowledgeContext(): Promise<string> {
    if (!currentCourseId) return "暂无上传课件";
    const entries = await db.knowledgeEntries
      .where("courseId")
      .equals(currentCourseId)
      .reverse()
      .sortBy("updatedAt");

    if (entries.length === 0) return "暂无上传课件";

    let context = "";
    for (const entry of entries) {
      const chunk = `【${entry.title}】\n${entry.content}\n\n---\n\n`;
      if (context.length + chunk.length > MAX_CONTEXT_CHARS) break;
      context += chunk;
    }
    return context;
  }

  async function handleSend() {
    if (!input.trim()) return;
    if (!aiSettings?.apiKey) {
      toast.error("请先在设置中配置 API Key");
      return;
    }
    if (!currentCourseId) return;

    const userContent = input.trim();
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation(currentCourseId);
        setCurrentConversation(convId);
      }

      await addMessage(convId, currentCourseId, "user", userContent);

      const isFirstMessage = !messages || messages.length === 0;
      if (isFirstMessage) {
        const title = userContent.slice(0, 20) + (userContent.length > 20 ? "..." : "");
        await updateTitle(convId, title);
      }

      const context = await getKnowledgeContext();
      const systemPrompt = SYSTEM_PROMPTS.chat.replace("{context}", context);

      const allMessages = [
        ...(messages || []).map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userContent },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: aiSettings,
          systemPrompt,
          messages: allMessages,
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
          setStreamingContent(result);
        }
      }

      await addMessage(convId, currentCourseId, "assistant", result);
      setStreamingContent("");
    } catch (err) {
      toast.error("对话失败: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const displayMessages = [
    ...(messages || []),
    ...(streamingContent ? [{ id: -1, role: "assistant" as const, content: streamingContent, conversationId: 0, courseId: 0, createdAt: new Date() }] : []),
  ];

  return (
    <CourseGuard>
      <div className="flex h-[calc(100vh-3rem)] md:h-[calc(100vh-1.5rem)] -m-6 md:-mt-6">
        <div className="hidden md:block w-56 shrink-0">
          <ConversationList />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 pt-4 pb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              AI 答疑对话
            </h2>
          </div>

          <div className="flex-1 flex flex-col min-h-0 px-6 pb-4">
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              {displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
                  <Bot className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">有什么问题尽管问</p>
                  <p className="text-sm mt-1">
                    可以问知识点、解题方法、概念解释等
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {displayMessages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <MarkdownRenderer content={msg.content} />
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t mt-auto">
              <Textarea
                placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="resize-none"
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-auto"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CourseGuard>
  );
}
