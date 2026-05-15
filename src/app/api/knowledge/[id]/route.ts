import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { KnowledgeEntry } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { courseId: string; title?: string; content?: string };
  const entries = await readJson<KnowledgeEntry[]>(`courses/${body.courseId}/knowledge.json`, []);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.title) entries[idx].title = body.title;
  if (body.content) entries[idx].content = body.content;
  entries[idx].updatedAt = new Date().toISOString();
  await writeJson(`courses/${body.courseId}/knowledge.json`, entries);
  return NextResponse.json(entries[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const entries = await readJson<KnowledgeEntry[]>(`courses/${courseId}/knowledge.json`, []);
  const filtered = entries.filter((e) => e.id !== id);
  await writeJson(`courses/${courseId}/knowledge.json`, filtered);
  return NextResponse.json({ ok: true });
}
