import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { ExamPaper } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { courseId: string; analysis?: string; name?: string };
  const papers = await readJson<ExamPaper[]>(`courses/${body.courseId}/exam-papers.json`, []);
  const idx = papers.findIndex((p) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.analysis !== undefined) papers[idx].analysis = body.analysis;
  if (body.name) papers[idx].name = body.name;
  await writeJson(`courses/${body.courseId}/exam-papers.json`, papers);
  return NextResponse.json(papers[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const papers = await readJson<ExamPaper[]>(`courses/${courseId}/exam-papers.json`, []);
  const filtered = papers.filter((p) => p.id !== id);
  await writeJson(`courses/${courseId}/exam-papers.json`, filtered);
  return NextResponse.json({ ok: true });
}
