import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { KnowledgeEntry } from "@/lib/types";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const entries = await readJson<KnowledgeEntry[]>(`courses/${courseId}/knowledge.json`, []);
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const body = await req.json() as Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt">;
  const entries = await readJson<KnowledgeEntry[]>(`courses/${body.courseId}/knowledge.json`, []);
  const now = new Date().toISOString();
  const entry: KnowledgeEntry = {
    ...body,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  entries.push(entry);
  await writeJson(`courses/${body.courseId}/knowledge.json`, entries);
  return NextResponse.json(entry, { status: 201 });
}
