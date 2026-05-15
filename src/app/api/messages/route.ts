import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { ChatMessage } from "@/lib/types";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!conversationId || !courseId) {
    return NextResponse.json({ error: "conversationId and courseId required" }, { status: 400 });
  }
  const messages = await readJson<ChatMessage[]>(`courses/${courseId}/messages/${conversationId}.json`, []);
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const { conversationId, courseId, role, content } = await req.json() as {
    conversationId: string;
    courseId: string;
    role: "user" | "assistant";
    content: string;
  };
  const filePath = `courses/${courseId}/messages/${conversationId}.json`;
  const messages = await readJson<ChatMessage[]>(filePath, []);
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    conversationId,
    courseId,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  await writeJson(filePath, messages);
  return NextResponse.json(message, { status: 201 });
}
