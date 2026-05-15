import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { Conversation } from "@/lib/types";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const type = req.nextUrl.searchParams.get("type");
  let conversations = await readJson<Conversation[]>(`courses/${courseId}/conversations.json`, []);
  if (type) {
    conversations = conversations.filter((c) => c.type === type);
  }
  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const { courseId, title, type, metadata } = await req.json() as {
    courseId: string;
    title: string;
    type?: "chat" | "exam-analysis";
    metadata?: Record<string, unknown>;
  };
  const conversations = await readJson<Conversation[]>(`courses/${courseId}/conversations.json`, []);
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    courseId,
    title,
    type: type || "chat",
    metadata,
    createdAt: now,
    updatedAt: now,
  };
  conversations.push(conversation);
  await writeJson(`courses/${courseId}/conversations.json`, conversations);
  return NextResponse.json(conversation, { status: 201 });
}
