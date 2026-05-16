"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatMessages } from "@/lib/hooks/use-chat-messages";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useAppStore, useLearningConversationId, useLearningNoteId } from "@/lib/store";
import { SYSTEM_PROMPTS } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { Send, RotateCcw, GraduationCap, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MonkeyChatPanelProps {
  panelId: string;
  courseId: string;
}

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function parseNoteOperations(text: string) {
  const ops: Array<
    | { type: "update"; noteId: string; content: string }
    | { type: "create"; title: string; content: string }
  > = [];

  const updateRegex = /\[\[NOTE_UPDATE:(.+?)\]\]\n?([\s\S]*?)\[\[\/NOTE_UPDATE\]\]/g;
  let match;
  while ((match = updateRegex.exec(text)) !== null) {
    ops.push({ type: "update", noteId: match[1].trim(), content: match[2].trim() });
  }

  const createRegex = /\[\[NOTE_CREATE:(.+?)\]\]\n?([\s\S]*?)\[\[\/NOTE_CREATE\]\]/g;
  while ((match = createRegex.exec(text)) !== null) {
    ops.push({ type: "create", title: match[1].trim(), content: match[2].trim() });
  }

  const displayText = text
    .replace(/\[\[NOTE_UPDATE:.+?\]\]\n?[\s\S]*?\[\[\/NOTE_UPDATE\]\]/g, "")
    .replace(/\[\[NOTE_CREATE:.+?\]\]\n?[\s\S]*?\[\[\/NOTE_CREATE\]\]/g, "")
    .trim();

  return { ops, displayText };
}

async function executeNoteOps(
  ops: ReturnType<typeof parseNoteOperations>["ops"],
  courseId: string
) {
  for (const op of ops) {
    if (op.type === "update") {
      await fetch(`/api/knowledge/${op.noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, content: op.content }),
      });
    } else {
      await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, source: "manual", title: op.title, content: op.content }),
      });
    }
  }
}

export function MonkeyChatPanel({ panelId, courseId }: MonkeyChatPanelProps) {
  const { setLearningConversationId } = useAppStore();
  const learningConversationId = useLearningConversationId();
  const learningNoteId = useLearningNoteId();
  const [conversationId, setConversationId] = useState<string | null>(learningConversationId);
  const { createConversation } = useConversations(courseId);
  const { messages: serverMessages, addMessage } = useChatMessages(conversationId, courseId);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCourseRef = useRef(courseId);

  // Reset everything when course changes
  useEffect(() => {
    if (courseId !== prevCourseRef.current) {
      prevCourseRef.current = courseId;
      setConversationId(null);
      setLocalMessages([]);
      setStreamingText("");
    }
  }, [courseId]);

  useEffect(() => {
    setConversationId(learningConversationId);
    if (!learningConversationId) {
      setLocalMessages([]);
    }
  }, [learningConversationId]);

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
    setLearningConversationId(id);
    setLocalMessages([]);
    setStreamingText("");
  }, [courseId, createConversation, setLearningConversationId]);

  async function fetchContext(): Promise<string> {
    try {
      const res = await fetch(`/api/context?courseId=${courseId}`);
      if (!res.ok) return "（无法加载课程材料）";
      const data = await res.json();

      let ctx = "";

      if (data.references?.length > 0) {
        ctx += "## 参考文件\n\n";
        for (const ref of data.references) {
          ctx += `### ${ref.title}\n${ref.textContent}\n\n`;
        }
      }

      if (data.notes?.length > 0) {
        ctx += "## 学生笔记\n\n";
        for (const note of data.notes) {
          ctx += `### ${note.title}（ID: ${note.id}）\n${note.content}\n\n`;
        }
      }

      if (data.examPapers?.length > 0) {
        ctx += "## 往年试卷\n\n";
        for (const paper of data.examPapers) {
          ctx += `### ${paper.name}${paper.year ? `（${paper.year}）` : ""}\n${paper.content}\n`;
          if (paper.analysis) {
            ctx += `\n**已有分析：**\n${paper.analysis}\n`;
          }
          ctx += "\n";
        }
      }

      if (learningNoteId) {
        ctx += `\n当前学生正在查看的笔记 ID: ${learningNoteId}\n`;
      }

      return ctx || "（当前课程暂无参考文件、笔记和试卷）";
    } catch {
      return "（加载课程材料失败）";
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    let convId = conversationId;
    if (!convId) {
      convId = await createConversation(courseId, text.slice(0, 20));
      setConversationId(convId);
      setLearningConversationId(convId);
    }

    setInput("");

    const userMsg: LocalMessage = { id: `local-${Date.now()}`, role: "user", content: text };
    setLocalMessages((prev) => [...prev, userMsg]);

    addMessage(convId, courseId, "user", text);

    setStreaming(true);
    setStreamingText("");

    try {
      const context = await fetchContext();
      const systemPrompt = SYSTEM_PROMPTS.monkey.replace("{context}", context);

      const chatMessages = [
        ...localMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          systemPrompt,
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

      // Parse note operations
      const { ops, displayText } = parseNoteOperations(fullText);

      if (ops.length > 0) {
        await executeNoteOps(ops, courseId);
      }

      const finalContent = displayText || fullText;
      const assistantMsg: LocalMessage = { id: `local-${Date.now()}-ai`, role: "assistant", content: finalContent };
      setLocalMessages((prev) => [...prev, assistantMsg]);
      setStreamingText("");

      addMessage(convId, courseId, "assistant", finalContent);
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
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          ) : (
            <article className="prose max-w-none text-[13px] [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h1]:text-sm [&_h2]:text-[13px] [&_h3]:text-[13px] [&_p]:text-[13px] [&_li]:text-[13px] [&_code]:text-[11px] [&_pre]:my-1.5 [&_blockquote]:my-1.5 [&_hr]:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          )}
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
            <p className="text-xs mt-1 opacity-60">我能看到你的参考文件和笔记，也可以帮你修改笔记</p>
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
            placeholder="询问 Examonkey..."
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
