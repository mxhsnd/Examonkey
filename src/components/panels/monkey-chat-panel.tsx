"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatMessages } from "@/lib/hooks/use-chat-messages";
import { useConversations } from "@/lib/hooks/use-conversations";
import { SYSTEM_PROMPTS } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { Send, Loader2, RotateCcw, GraduationCap, User } from "lucide-react";

interface MonkeyChatPanelProps {
  panelId: string;
  courseId: string;
}

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function MonkeyChatPanel({ panelId, courseId }: MonkeyChatPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { createConversation } = useConversations(courseId);
  const { messages: serverMessages, addMessage } = useChatMessages(conversationId, courseId);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const convIdRef = useRef<string | null>(null);

  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (serverMessages && serverMessages.length > 0) {
      setLocalMessages(serverMessages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
    }
  }, [serverMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, streamingText]);

  const handleNewChat = useCallback(async () => {
    const id = await createConversation(courseId, "Monkey Chat");
    setConversationId(id);
    setLocalMessages([]);
    setStreamingText("");
  }, [courseId, createConversation]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    let convId = conversationId;
    if (!convId) {
      convId = await createConversation(courseId, text.slice(0, 20));
      setConversationId(convId);
    }

    setInput("");

    const userMsg: LocalMessage = { id: `local-${Date.now()}`, role: "user", content: text };
    setLocalMessages((prev) => [...prev, userMsg]);

    addMessage(convId, courseId, "user", text);

    setStreaming(true);
    setStreamingText("");

    try {
      const chatMessages = [
        ...localMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          systemPrompt: SYSTEM_PROMPTS.monkey,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        setStreamingText(`错误: ${errText}`);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setStreamingText(fullText);
        }
      }

      const assistantMsg: LocalMessage = { id: `local-${Date.now()}-ai`, role: "assistant", content: fullText };
      setLocalMessages((prev) => [...prev, assistantMsg]);
      setStreamingText("");

      addMessage(convId, courseId, "assistant", fullText);
    } catch (err) {
      setStreamingText(`请求失败: ${(err as Error).message}`);
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function renderMessage(role: "user" | "assistant", content: string, key?: string) {
    const isUser = role === "user";
    return (
      <div key={key} className={cn("flex gap-2.5 items-start", isUser && "flex-row-reverse")}>
        <div className={cn(
          "shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
        )}>
          {isUser ? <User className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
        </div>
        <div className={cn(
          "rounded-2xl px-3 py-2 text-[13px] leading-relaxed max-w-[80%] w-fit",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        )}>
          <div className="whitespace-pre-wrap break-words">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold text-sm">Examonkey</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleNewChat}
          title="新对话"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {localMessages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">有什么问题尽管问我</p>
            <p className="text-xs mt-1 opacity-60">我可以帮你总结知识点、分析真题、模拟出题</p>
          </div>
        )}
        {localMessages.map((msg) => renderMessage(msg.role, msg.content, msg.id))}
        {streamingText && renderMessage("assistant", streamingText, "streaming")}
        {streaming && !streamingText && (
          <div className="flex gap-2.5 items-start">
            <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-3 pt-2 shrink-0">
        <div className="flex gap-2 items-end rounded-2xl border p-2 shadow-sm">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="询问 Examonkey"
            rows={1}
            className="min-h-[36px] max-h-[120px] resize-none text-sm border-0 shadow-none focus-visible:ring-0 p-1"
          />
          <Button
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 rounded-full transition-all",
              input.trim() ? "opacity-100" : "opacity-40"
            )}
            onClick={handleSend}
            disabled={!input.trim() || streaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
