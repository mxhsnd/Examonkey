import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson, removeFile } from "@/lib/server/storage";
import type { Conversation } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { courseId, title, metadata } = await req.json() as {
    courseId: string;
    title?: string;
    metadata?: Record<string, unknown>;
  };
  const conversations = await readJson<Conversation[]>(`courses/${courseId}/conversations.json`, []);
  const idx = conversations.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (title !== undefined) conversations[idx].title = title;
  if (metadata !== undefined) conversations[idx].metadata = metadata;
  conversations[idx].updatedAt = new Date().toISOString();
  await writeJson(`courses/${courseId}/conversations.json`, conversations);
  return NextResponse.json(conversations[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const conversations = await readJson<Conversation[]>(`courses/${courseId}/conversations.json`, []);
  const filtered = conversations.filter((c) => c.id !== id);
  await writeJson(`courses/${courseId}/conversations.json`, filtered);
  await removeFile(`courses/${courseId}/messages/${id}.json`);
  return NextResponse.json({ ok: true });
}
