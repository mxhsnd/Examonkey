"use client";

import { useConversations } from "@/lib/hooks/use-conversations";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Plus, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ConversationList() {
  const { currentCourseId, currentConversationId, setCurrentConversation } = useAppStore();
  const { conversations, createConversation, deleteConversation } = useConversations(currentCourseId);

  async function handleNew() {
    if (!currentCourseId) return;
    const id = await createConversation(currentCourseId);
    setCurrentConversation(id);
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteConversation(id);
    if (currentConversationId === id) {
      setCurrentConversation(null);
    }
    toast.success("已删除对话");
  }

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-3 border-b">
        <Button onClick={handleNew} className="w-full gap-1" size="sm">
          <Plus className="h-3.5 w-3.5" />
          新对话
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {conversations?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setCurrentConversation(conv.id!)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                currentConversationId === conv.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{conv.title}</span>
              <button
                onClick={(e) => handleDelete(conv.id!, e)}
                className="hidden group-hover:block shrink-0 rounded p-0.5 hover:bg-background"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </button>
          ))}
          {(!conversations || conversations.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-4">
              暂无对话
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
