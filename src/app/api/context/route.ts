import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { readJson } from "@/lib/server/storage";
import type { KnowledgeEntry, ExamPaper } from "@/lib/types";

const REFERENCES_DIR = path.join(process.cwd(), "data", "references");

interface ReferenceEntry {
  id: string;
  title: string;
  category: string;
  fileName: string;
  mimeType: string;
  textContent: string;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  }

  // Load references
  let references: { id: string; title: string; textContent: string }[] = [];
  try {
    const manifestPath = path.join(REFERENCES_DIR, courseId, "manifest.json");
    const data = await fs.readFile(manifestPath, "utf-8");
    const entries: ReferenceEntry[] = JSON.parse(data);
    references = entries.map((e) => ({
      id: e.id,
      title: e.title,
      textContent: e.textContent,
    }));
  } catch {
    // no references yet
  }

  // Load notes
  const notes = await readJson<KnowledgeEntry[]>(`courses/${courseId}/knowledge.json`, []);

  // Load exam papers
  const examPapers = await readJson<ExamPaper[]>(`courses/${courseId}/exam-papers.json`, []);

  return NextResponse.json({
    references,
    notes: notes.map((n) => ({ id: n.id, title: n.title, content: n.content })),
    examPapers: examPapers.map((p) => ({ id: p.id, name: p.name, year: p.year, content: p.content, analysis: p.analysis })),
  });
}
