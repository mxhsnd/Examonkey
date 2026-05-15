import { NextRequest, NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/server/storage";
import type { ExamPaper } from "@/lib/types";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const papers = await readJson<ExamPaper[]>(`courses/${courseId}/exam-papers.json`, []);
  return NextResponse.json(papers);
}

export async function POST(req: Request) {
  const body = await req.json() as Omit<ExamPaper, "id" | "createdAt">;
  const papers = await readJson<ExamPaper[]>(`courses/${body.courseId}/exam-papers.json`, []);
  const paper: ExamPaper = {
    ...body,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  papers.push(paper);
  await writeJson(`courses/${body.courseId}/exam-papers.json`, papers);
  return NextResponse.json(paper, { status: 201 });
}
